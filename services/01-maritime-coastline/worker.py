"""
Project Frontier - Maritime Coastline Worker (USCG & US Navy)
Processes AIS positions, evaluates trajectory anomaly score using InferenceProcessPool,
and emits ThreatAlertEvent when dark ships or rendezvous are identified.
"""

import asyncio
from typing import Any, Dict, List, Optional

from shared.concurrency.mp_engine import InferenceProcessPool
from shared.events.schemas import (
    Agency,
    KafkaTopic,
    SecurityRing,
    ThreatAlertEvent,
)


class MaritimeWorker:
    """Worker for Subsystem 01 (Maritime & Blue Border)."""

    def __init__(self, mp_pool: Optional[InferenceProcessPool] = None):
        self.pool = mp_pool or InferenceProcessPool.get_instance()
        self.anomaly_threshold = 0.65

    async def process_ais_trajectory(
        self,
        mmsi: str,
        positions: List[Dict[str, Any]],
    ) -> Optional[ThreatAlertEvent]:
        """
        Process a list of AIS points for a vessel:
        positions: list of dicts with lat, lon, sog, cog, delta_t.
        """
        if not positions or len(positions) < 3:
            return None

        # Build normalized feature sequence for the TrajectoryAnomalyLSTM
        features = []
        for p in positions:
            lat_norm = (float(p.get("latitude", 26.0)) - 26.0) / 4.0
            lon_norm = (float(p.get("longitude", -90.0)) - (-90.0)) / 8.0
            sog_norm = float(p.get("sog", 10.0)) / 25.0
            cog_norm = float(p.get("cog", 0.0)) / 360.0
            delta_t_norm = min(float(p.get("delta_t", 60.0)) / 3600.0, 1.0)
            features.append([lat_norm, lon_norm, sog_norm, cog_norm, delta_t_norm])

        # Delegate PyTorch inference to the isolated Multiprocessing Pool
        score = await self.pool.infer_maritime_anomaly(features)

        last_pos = positions[-1]
        lat = float(last_pos.get("latitude", 26.0))
        lon = float(last_pos.get("longitude", -90.0))

        if score >= self.anomaly_threshold:
            alert = ThreatAlertEvent(
                subsystem="01-maritime-coastline",
                ring=SecurityRing.RING_1_MARITIME,
                lead_agency=Agency.USCG,
                severity=round(score, 4),
                latitude=lat,
                longitude=lon,
                target_id=f"MMSI-{mmsi}",
                threat_type="AIS_DARK_SHIP_OR_RENDEZVOUS",
                metadata={
                    "mmsi": mmsi,
                    "anomaly_score": score,
                    "sog_knots": last_pos.get("sog"),
                    "track_length": len(positions),
                },
            )
            return alert

        return None

