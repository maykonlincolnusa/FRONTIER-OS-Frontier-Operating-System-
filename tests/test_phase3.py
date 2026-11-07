"""
Project Frontier - Phase 3 Integration Tests
Tests ST-GNN Narcotics Intelligence, Satellite Reconnaissance,
and C2 Gateway REST/Streaming endpoints.
"""

import pytest
from httpx import AsyncClient, ASGITransport

from services.c2_gateway.main import app
from services.narcotics_intel.worker import NarcoticsIntelWorker
from services.geospatial_recon.satellite_worker import SatelliteReconWorker


@pytest.mark.asyncio
async def test_narcotics_st_gnn_worker():
    """Verify ST-GNN produces risk forecasts for strategic corridors."""
    worker = NarcoticsIntelWorker()
    alerts = await worker.predict_corridor_risks(historical_days=7)
    assert isinstance(alerts, list)
    for alert in alerts:
        assert 0.0 <= alert.severity <= 1.0
        assert alert.lead_agency.value in ["DEA", "CBP"]


@pytest.mark.asyncio
async def test_satellite_recon_worker():
    """Verify satellite worker detects overhead tactical features."""
    worker = SatelliteReconWorker()
    # High-contrast patch -> Clandestine Airstrip
    high_contrast_features = [0.8, 0.1, 0.9, 0.1, 0.8, 0.2, 0.9, 0.1] * 2
    alert = await worker.analyze_satellite_tile(
        tile_id="TILE-NM-04",
        latitude=31.90,
        longitude=-108.50,
        patch_features=high_contrast_features,
    )
    assert alert is not None
    assert alert.threat_type in ["CLANDESTINE_AIRSTRIP", "DESERT_VEHICLE_CONVOY"]
    assert alert.severity >= 0.70


@pytest.mark.asyncio
async def test_c2_gateway_endpoints():
    """Verify C2 Gateway REST endpoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Healthz
        res = await client.get("/healthz")
        assert res.status_code == 200
        assert res.json()["status"] == "HEALTHY"

        # 2. Geofences
        res = await client.get("/api/v1/geofences")
        assert res.status_code == 200
        data = res.json()
        assert data["type"] == "FeatureCollection"
        assert len(data["features"]) == 3

        # 3. Active Threats
        res = await client.get("/api/v1/threats/active")
        assert res.status_code == 200
        assert "threats" in res.json()

        # 4. FBI Wanted Matches
        res = await client.get("/api/v1/fbi/wanted-matches")
        assert res.status_code == 200
        assert "matches" in res.json()

        # 5. Simulation Event Injection
        res = await client.post(
            "/api/v1/simulation/inject",
            json={
                "event_type": "THREAT_ALERT",
                "subsystem": "02-airspace-shield",
                "ring": "RING_2_FEDERAL",
                "lead_agency": "USAF",
                "severity": 0.91,
                "latitude": 31.5,
                "longitude": -106.5,
                "target_id": "TEST-AIR-99",
                "threat_type": "LOW_ALT_CLANDESTINE_FLIGHT",
            },
        )
        assert res.status_code == 200
        assert res.json()["status"] == "BROADCASTED"
