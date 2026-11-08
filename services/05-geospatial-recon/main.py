"""
Project Frontier - Microservice 05: Geospatial Satellite Recon (US Army & NGA)
Port: 8005
Executes YOLOv8-OBB Satellite Patch Detection for clandestine airstrips and convoys.
"""

import time
from typing import Any, Dict, List, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from services.geospatial_recon.satellite_worker import SatelliteReconWorker

app = FastAPI(
    title="Frontier Microservice 05 - Geospatial Recon (US Army / NGA)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

worker = SatelliteReconWorker()
START_TIME = time.time()


class SatelliteTileRequest(BaseModel):
    tile_id: str = "SENTINEL2-SONORA-DESERT-09"
    latitude: float = 31.85
    longitude: float = -111.45
    patch_features: Optional[List[float]] = None


@app.get("/healthz")
async def healthz() -> Dict[str, Any]:
    return {
        "service_id": "05-geospatial-recon",
        "name": "Orbital & Drone Recon",
        "port": 8005,
        "status": "ONLINE",
        "ring": "RING_2_FEDERAL",
        "agencies": ["US_ARMY", "NGA", "CBP"],
        "model": "frontier_sat_yolov8.onnx (YOLOv8-Military xView)",
        "uptime_sec": round(time.time() - START_TIME, 1),
    }


@app.post("/api/v1/infer")
async def infer_satellite_tile(req: SatelliteTileRequest) -> Dict[str, Any]:
    t0 = time.perf_counter()
    # High-variance feature patch triggers clandestine airstrip / convoy detection
    features = req.patch_features or [0.95, 0.12, 0.88, 0.15, 0.92, 0.10, 0.85, 0.18, 0.91, 0.11]
    alert = await worker.analyze_satellite_tile(
        tile_id=req.tile_id,
        latitude=req.latitude,
        longitude=req.longitude,
        patch_features=features,
    )
    latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    if alert:
        payload = alert.model_dump(mode="json")
        payload["event_type"] = "THREAT_ALERT"
        return {
            "service": "05-geospatial-recon",
            "status": "TARGET_DETECTED",
            "latency_ms": latency_ms,
            "alert": payload,
        }

    return {
        "service": "05-geospatial-recon",
        "status": "CLEAR_SECTOR",
        "latency_ms": latency_ms,
        "alert": None,
    }
