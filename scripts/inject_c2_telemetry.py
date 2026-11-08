"""
Project Frontier - Continuous Telemetry & Multi-Ring Threat Injector
Simulates continuous multi-agency C4ISR event streaming into the C2 Gateway
for live tactical dashboard validation.
"""

import asyncio
import random
import time
import httpx


SIMULATED_EVENTS = [
    {
        "event_type": "THREAT_ALERT",
        "subsystem": "01-maritime-coastline",
        "ring": "RING_1_MARITIME",
        "lead_agency": "USCG",
        "severity": 0.89,
        "latitude": 26.15,
        "longitude": -95.20,
        "target_id": "MMSI-3678129",
        "threat_type": "AIS_DARK_SHIP_OR_RENDEZVOUS",
        "metadata": {"sog_knots": 1.8, "status": "DARK_VESSEL_OFFSHORE"},
    },
    {
        "event_type": "THREAT_ALERT",
        "subsystem": "02-airspace-shield",
        "ring": "RING_2_FEDERAL",
        "lead_agency": "USAF",
        "severity": 0.94,
        "latitude": 31.40,
        "longitude": -106.35,
        "target_id": "AIR-CLANDESTINE-88",
        "threat_type": "LOW_ALT_CLANDESTINE_FLIGHT",
        "metadata": {"altitude_ft": 520, "velocity_knots": 115},
    },
    {
        "event_type": "JURISDICTION_HANDOFF",
        "target_id": "VESSEL-NARCO-41",
        "from_ring": "RING_1_MARITIME",
        "to_ring": "RING_2_FEDERAL",
        "from_agency": "USCG",
        "to_agency": "CBP",
        "last_known_lat": 26.04,
        "last_known_lon": -97.14,
        "reason": "Target beached at South Padre Island outside POE; transferred from Coast Guard to CBP Tactical Unit.",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    },
    {
        "event_type": "THREAT_ALERT",
        "subsystem": "03-narcotics-intel",
        "ring": "RING_2_FEDERAL",
        "lead_agency": "DEA",
        "severity": 0.91,
        "latitude": 27.50,
        "longitude": -99.50,
        "target_id": "POE-LAREDO",
        "threat_type": "NARCOTICS_CORRIDOR_SURGE",
        "metadata": {"corridor": "I-35 Corridor", "risk_24h": 0.91, "agencies": "DEA / CBP"},
    },
    {
        "event_type": "JURISDICTION_HANDOFF",
        "target_id": "CONVOY-AZ-19",
        "from_ring": "RING_2_FEDERAL",
        "to_ring": "RING_3_INTERSTATE",
        "from_agency": "CBP",
        "to_agency": "FBI",
        "last_known_lat": 32.22,
        "last_known_lon": -110.97,
        "reason": "Vehicle convoy bypassed secondary checkpoint entering I-10 Tucson corridor; jurisdiction transferred to FBI.",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    },
    {
        "event_type": "THREAT_ALERT",
        "subsystem": "04-criminal-interstate",
        "ring": "RING_3_INTERSTATE",
        "lead_agency": "FBI",
        "severity": 0.96,
        "latitude": 29.42,
        "longitude": -98.49,
        "target_id": "FUGITIVE-FBI-TX09",
        "threat_type": "FBI_WANTED_FUGITIVE_SIGHTING",
        "metadata": {"corridor": "I-10 Junction San Antonio", "face_match_confidence": 0.96},
    },
    {
        "event_type": "THREAT_ALERT",
        "subsystem": "05-geospatial-recon",
        "ring": "RING_2_FEDERAL",
        "lead_agency": "US_ARMY",
        "severity": 0.85,
        "latitude": 31.85,
        "longitude": -110.20,
        "target_id": "SAT-AIRSTRIP-NM03",
        "threat_type": "CLANDESTINE_AIRSTRIP",
        "metadata": {"source": "Sentinel-2 Satellite Recon", "length_m": 1200},
    },
    {
        "event_type": "THREAT_ALERT",
        "subsystem": "01-maritime-coastline",
        "ring": "RING_1_MARITIME",
        "lead_agency": "USCG",
        "severity": 0.93,
        "latitude": 5.20,
        "longitude": -79.80,
        "target_id": "JIATF-SOUTH-NARCO-SUB",
        "threat_type": "SEMI_SUBMERSIBLE_VESSEL",
        "metadata": {"origin": "Tumaco / Colombia", "theater": "JIATF-South Eastern Pacific", "sog_knots": 9.5},
    },
    {
        "event_type": "THREAT_ALERT",
        "subsystem": "01-maritime-coastline",
        "ring": "RING_1_MARITIME",
        "lead_agency": "DEA",
        "severity": 0.88,
        "latitude": 18.25,
        "longitude": -68.40,
        "target_id": "CARIBBEAN-FAST-BOAT",
        "threat_type": "CARIBBEAN_NARCO_GO_FAST",
        "metadata": {"corridor": "Mona Passage (DR to PR)", "interception": "USCG Cutter Dauntless"},
    },
    {
        "event_type": "THREAT_ALERT",
        "subsystem": "03-narcotics-intel",
        "ring": "RING_3_INTERSTATE",
        "lead_agency": "DEA",
        "severity": 0.87,
        "latitude": -23.95,
        "longitude": -46.30,
        "target_id": "BRAZIL-ATLANTIC-HUB",
        "threat_type": "MARITIME_CONTAINER_ANOMALY",
        "metadata": {"port": "Porto de Santos / Brasil", "destination": "Port of Houston", "status": "CONTAINER_XRAY_FLAG"},
    },
]


async def inject_continuous_telemetry(c2_url: str = "http://localhost:8000", interval: float = 3.0):
    print(f"[FRONTIER C2 SIMULATOR] Injecting real-time telemetry into {c2_url}...")
    async with httpx.AsyncClient(timeout=5.0) as client:
        idx = 0
        while True:
            event = dict(SIMULATED_EVENTS[idx % len(SIMULATED_EVENTS)])
            # Apply slight coordinate jitter for live dynamic tracking
            if "latitude" in event and "longitude" in event:
                event["latitude"] += round(random.gauss(0, 0.02), 4)
                event["longitude"] += round(random.gauss(0, 0.02), 4)
                event["event_id"] = f"live-evt-{int(time.time() * 1000)}"

            try:
                res = await client.post(f"{c2_url}/api/v1/simulation/inject", json=event)
                target = event.get("target_id")
                agency = event.get("lead_agency") or event.get("from_agency")
                print(f"  -> Injected {event.get('threat_type') or 'HANDOFF'} | Target: {target} | Agency: {agency} | Status: {res.status_code}")
            except Exception as e:
                print(f"  [Waiting for C2 Gateway on {c2_url}...] ({e})")

            idx += 1
            await asyncio.sleep(interval)


if __name__ == "__main__":
    import sys
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    asyncio.run(inject_continuous_telemetry(c2_url=url, interval=2.5))

