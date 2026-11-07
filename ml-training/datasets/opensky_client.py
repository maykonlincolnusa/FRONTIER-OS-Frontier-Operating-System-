"""
Project Frontier - OpenSky Network ADS-B Ingestion Client
Ingests real-time flight state vectors from OpenSky Network API for Ring 2 (Airspace Shield).
"""

from typing import Any, Dict, List, Optional
import httpx
from pydantic import BaseModel

from shared.config import get_settings


class OpenSkyStateVector(BaseModel):
    icao24: str
    callsign: Optional[str] = None
    origin_country: str
    time_position: Optional[int] = None
    last_contact: int
    longitude: Optional[float] = None
    latitude: Optional[float] = None
    baro_altitude: Optional[float] = None
    on_ground: bool
    velocity: Optional[float] = None
    true_track: Optional[float] = None
    vertical_rate: Optional[float] = None
    squawk: Optional[str] = None
    spi: bool = False
    position_source: int = 0


class OpenSkyClient:
    """Client for OpenSky Network REST API with bounding box query support."""

    def __init__(self, base_url: str | None = None):
        settings = get_settings()
        self.base_url = base_url or settings.OPENSKY_API_BASE
        self.auth = None
        if settings.OPENSKY_USERNAME and settings.OPENSKY_PASSWORD:
            self.auth = (settings.OPENSKY_USERNAME, settings.OPENSKY_PASSWORD)

    async def fetch_states(
        self,
        lamin: float = 25.0,
        lamax: float = 33.5,
        lomin: float = -118.0,
        lomax: float = -96.5,
        timeout: float = 10.0,
    ) -> List[OpenSkyStateVector]:
        """
        Fetch active flights within bounding box (defaults to US-Mexico Southern Border).
        OpenSky returns: [icao24, callsign, origin_country, time_position, last_contact,
                          longitude, latitude, baro_altitude, on_ground, velocity,
                          true_track, vertical_rate, sensors, geo_altitude, squawk, spi, position_source]
        """
        params = {
            "lamin": lamin,
            "lamax": lamax,
            "lomin": lomin,
            "lomax": lomax,
        }
        url = f"{self.base_url}/states/all"

        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            try:
                response = await client.get(url, params=params, auth=self.auth)
                if response.status_code != 200:
                    return []
                data = response.json()
            except Exception:
                return []

        raw_states = data.get("states") or []
        parsed: List[OpenSkyStateVector] = []

        for s in raw_states:
            if not s or len(s) < 17:
                continue
            # Filter out airborne states without coordinates
            if s[5] is None or s[6] is None:
                continue

            parsed.append(
                OpenSkyStateVector(
                    icao24=str(s[0]),
                    callsign=str(s[1]).strip() if s[1] else None,
                    origin_country=str(s[2]),
                    time_position=s[3],
                    last_contact=int(s[4] or 0),
                    longitude=float(s[5]),
                    latitude=float(s[6]),
                    baro_altitude=float(s[7]) if s[7] is not None else None,
                    on_ground=bool(s[8]),
                    velocity=float(s[9]) if s[9] is not None else None,
                    true_track=float(s[10]) if s[10] is not None else None,
                    vertical_rate=float(s[11]) if s[11] is not None else None,
                    squawk=str(s[14]) if s[14] is not None else None,
                    spi=bool(s[15]),
                    position_source=int(s[16] or 0),
                )
            )

        return parsed

