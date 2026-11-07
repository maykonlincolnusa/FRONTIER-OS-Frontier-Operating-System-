"""
Project Frontier - Airspace Shield Worker (USAF & FAA)
Consumes live flight state vectors from OpenSky Network API (US-Mexico border),
routes inference through InferenceProcessPool, and emits ThreatAlertEvent.
"""

import asyncio
from typing import Any, Dict, List, Optional
import httpx

from shared.concurrency.mp_engine import InferenceProcessPool
from shared.config import get_settings
from shared.events.schemas import (
    Agency,
    KafkaTopic,
    SecurityRing,
    ThreatAlertEvent,
)


class AirspaceWorker:
    """Worker for Subsystem 02 (Airspace Shield)."""

    def __init__(self, mp_pool: Optional[InferenceProcessPool] = None):
        self.pool = mp_pool or InferenceProcessPool.get_instance()
        self.settings = get_settings()
        self.anomaly_threshold = 0.65
        # US-Mexico Southern Border Bounding Box
        self.bbox = {
            "lamin": 25.0,
            "lamax": 33.5,
            "lomin": -118.0,
            "lomax": -96.5,
        }

    async def fetch_opensky_states(self) -> List[Dict[str, Any]]:
        """
        Poll real OpenSky Network API for active flights in the Southern Border box.
        """
        url = f"{self.settings.OPENSKY_API_BASE}/states/all"
        auth = None
        if self.settings.OPENSKY_USERNAME and self.settings.OPENSKY_PASSWORD:
            auth = (self.settings.OPENSKY_USERNAME, self.settings.OPENSKY_PASSWORD)

        try:
            async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
                res = await client.get(url, params=self.bbox, auth=auth)
                if res.status_code != 200:
                    return []
                data = res.json()
                raw_states = data.get("states") or []
        except Exception:
            return []

        flights = []
        for s in raw_states:
            if len(s) >= 17 and s[5] is not None and s[6] is not None:
                flights.append({
                    "icao24": s[0],
                    "callsign": (s[1] or "").strip(),
                    "longitude": float(s[5]),
                    "latitude": float(s[6]),
                    "baro_altitude": float(s[7]) if s[7] is not None else 0.0,
                    "velocity": float(s[9]) if s[9] is not None else 0.0,
                    "vertical_rate": float(s[11]) if s[11] is not None else 0.0,
                    "geo_altitude": float(s[13]) if s[13] is not None else float(s[7] or 0.0),
                    "squawk": s[14],
                })
        return flights

    async def evaluate_flight_state(self, flight: Dict[str, Any]) -> Optional[ThreatAlertEvent]:
        """
        Normalize flight features and execute Autoencoder inference in the mp pool.
        """
        baro_alt = flight.get("baro_altitude", 0.0)
        vel = flight.get("velocity", 0.0)
        vert_rate = flight.get("vertical_rate", 0.0)
        geo_alt = flight.get("geo_altitude", baro_alt)

        # Normalize features
        baro_norm = min(max(baro_alt / 12000.0, 0.0), 1.0)
        vel_norm = min(max(vel / 250.0, 0.0), 1.0)
        vert_norm = min(max((vert_rate + 20.0) / 40.0, 0.0), 1.0)
        geo_norm = min(max(geo_alt / 12000.0, 0.0), 1.0)

        vector = [baro_norm, vel_norm, vert_norm, geo_norm]

        # Process inference in multiprocessing pool
        score = await self.pool.infer_flight_anomaly(vector)

        if score >= self.anomaly_threshold:
            lat = flight.get("latitude", 31.0)
            lon = flight.get("longitude", -106.0)
            target_id = flight.get("callsign") or flight.get("icao24") or "UNKNOWN-AIR"

            return ThreatAlertEvent(
                subsystem="02-airspace-shield",
                ring=SecurityRing.RING_2_FEDERAL,
                lead_agency=Agency.USAF,
                severity=round(score, 4),
                latitude=lat,
                longitude=lon,
                target_id=str(target_id),
                threat_type="LOW_ALT_CLANDESTINE_FLIGHT",
                metadata={
                    "icao24": flight.get("icao24"),
                    "callsign": flight.get("callsign"),
                    "baro_altitude_m": baro_alt,
                    "velocity_mps": vel,
                    "squawk": flight.get("squawk"),
                    "anomaly_score": score,
                },
            )

        return None

