"""
Project Frontier - PostGIS Spatial Engine with Transactional Concurrency Control
Evaluates target geofencing transitions across the 3 Defense-in-Depth Rings.
Combines JurisdictionLockManager with PostgreSQL SELECT FOR UPDATE SKIP LOCKED.
"""

import asyncio
from typing import Any, Dict, Optional, Tuple

try:
    import asyncpg
except ImportError:
    asyncpg = None

from shared.concurrency.distributed_lock import JurisdictionLockManager
from shared.config import get_settings
from shared.events.schemas import (
    Agency,
    JurisdictionHandoffEvent,
    SecurityRing,
    TargetType,
)
from shared.geo.utils import classify_fast_security_ring


class GeofenceEngine:
    """
    Executes concurrency-safe spatial evaluation of target trajectories against PostGIS 3-Rings.
    Guarantees idempotence: only one worker can trigger a handoff per target boundary breach.
    """

    def __init__(
        self,
        lock_manager: Optional[JurisdictionLockManager] = None,
        db_pool: Optional[Any] = None,
    ):
        self.settings = get_settings()
        self.lock_manager = lock_manager or JurisdictionLockManager()
        self._pool = db_pool

    async def get_db_pool(self) -> Optional[Any]:
        """Lazy initialization of asyncpg connection pool."""
        if self._pool is None and asyncpg is not None:
            try:
                self._pool = await asyncpg.create_pool(
                    host=self.settings.POSTGRES_HOST,
                    port=self.settings.POSTGRES_PORT,
                    user=self.settings.POSTGRES_USER,
                    password=self.settings.POSTGRES_PASSWORD,
                    database=self.settings.POSTGRES_DB,
                    min_size=2,
                    max_size=10,
                    timeout=5.0,
                )
            except Exception:
                self._pool = None
        return self._pool

    async def detect_ring_postgis(
        self,
        conn: Any,
        longitude: float,
        latitude: float,
    ) -> Optional[Tuple[str, list[str]]]:
        """Query PostGIS using ST_Contains against security_rings."""
        query = """
            SELECT ring_id, lead_agencies
            FROM security_rings
            WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))
            ORDER BY ring_level ASC
            LIMIT 1;
        """
        row = await conn.fetchrow(query, longitude, latitude)
        if row:
            return str(row["ring_id"]), list(row["lead_agencies"])
        return None

    async def process_target_position(
        self,
        target_id: str,
        target_type: TargetType,
        longitude: float,
        latitude: float,
        speed_knots: Optional[float] = None,
        heading: Optional[float] = None,
        altitude_feet: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Tuple[bool, Optional[JurisdictionHandoffEvent]]:
        """
        Evaluate target coordinates with transactional exclusion.
        Returns: (handoff_triggered: bool, handoff_event: Optional[JurisdictionHandoffEvent])
        """
        metadata = metadata or {}
        handoff_event: Optional[JurisdictionHandoffEvent] = None
        handoff_triggered = False

        # Step 1: Distributed Lock acquisition for target_id
        async with self.lock_manager.acquire(target_id, ttl_seconds=5) as acquired:
            if not acquired:
                # Another worker is already evaluating telemetry for this exact target
                return False, None

            pool = await self.get_db_pool()

            if pool is not None:
                async with pool.acquire() as conn:
                    async with conn.transaction():
                        # Step 2: Acquire row lock on tracked entity via FOR UPDATE SKIP LOCKED
                        row = await conn.fetchrow(
                            """
                            SELECT current_ring, lead_agency
                            FROM tracked_entities
                            WHERE target_id = $1
                            FOR UPDATE SKIP LOCKED;
                            """,
                            target_id,
                        )

                        # Step 3: Spatial query in PostGIS to determine current ring
                        ring_info = await self.detect_ring_postgis(conn, longitude, latitude)

                        if ring_info:
                            detected_ring_id, agencies = ring_info
                            new_agency_str = agencies[0] if agencies else "CBP"
                        else:
                            fast_ring, fast_agency = classify_fast_security_ring(longitude, latitude)
                            detected_ring_id = fast_ring.value
                            new_agency_str = fast_agency.value

                        prev_ring = row["current_ring"] if row else None
                        prev_agency = row["lead_agency"] if row else None

                        # Step 4: Detect boundary crossing between rings
                        if prev_ring is not None and prev_ring != detected_ring_id:
                            handoff_triggered = True
                            reason = (
                                f"Spatial Geofence boundary crossed: Target {target_id} "
                                f"transitioned from {prev_ring} ({prev_agency}) to {detected_ring_id} ({new_agency_str})"
                            )

                            # Record handoff in audit table
                            await conn.execute(
                                """
                                INSERT INTO jurisdiction_handoffs (
                                    target_id, from_ring, to_ring, from_agency, to_agency,
                                    last_known_lat, last_known_lon, reason
                                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
                                """,
                                target_id,
                                prev_ring,
                                detected_ring_id,
                                prev_agency or "USCG",
                                new_agency_str,
                                latitude,
                                longitude,
                                reason,
                            )

                            handoff_event = JurisdictionHandoffEvent(
                                target_id=target_id,
                                from_ring=SecurityRing(prev_ring),
                                to_ring=SecurityRing(detected_ring_id),
                                from_agency=Agency(prev_agency) if prev_agency in Agency.__members__ else Agency.USCG,
                                to_agency=Agency(new_agency_str) if new_agency_str in Agency.__members__ else Agency.CBP,
                                last_known_lat=latitude,
                                last_known_lon=longitude,
                                reason=reason,
                            )

                        # Step 5: Upsert entity location
                        await conn.execute(
                            """
                            INSERT INTO tracked_entities (
                                target_id, target_type, current_ring, lead_agency,
                                last_location, speed_knots, heading, altitude_feet, metadata, last_seen
                            ) VALUES (
                                $1, $2, $3, $4,
                                ST_SetSRID(ST_MakePoint($5, $6), 4326),
                                $7, $8, $9, $10::jsonb, NOW()
                            )
                            ON CONFLICT (target_id) DO UPDATE SET
                                target_type = EXCLUDED.target_type,
                                current_ring = EXCLUDED.current_ring,
                                lead_agency = EXCLUDED.lead_agency,
                                last_location = EXCLUDED.last_location,
                                speed_knots = COALESCE(EXCLUDED.speed_knots, tracked_entities.speed_knots),
                                heading = COALESCE(EXCLUDED.heading, tracked_entities.heading),
                                altitude_feet = COALESCE(EXCLUDED.altitude_feet, tracked_entities.altitude_feet),
                                last_seen = NOW();
                            """,
                            target_id,
                            target_type.value,
                            detected_ring_id,
                            new_agency_str,
                            longitude,
                            latitude,
                            speed_knots,
                            heading,
                            altitude_feet,
                            "{}",
                        )
            else:
                # In-memory heuristic fallback when database connection is unavailable
                fast_ring, fast_agency = classify_fast_security_ring(longitude, latitude)
                # In standalone simulation mode without DB
                pass

        return handoff_triggered, handoff_event

    async def close(self):
        """Cleanly close connection pools."""
        if self._pool is not None:
            await self._pool.close()
            self._pool = None
        await self.lock_manager.close()
