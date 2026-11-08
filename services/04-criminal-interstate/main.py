"""
Project Frontier - Microservice 04: Criminal Interstate Surveillance (FBI & State Police)
Port: 8004
Executes YOLOv8 ALPR & ArcFace Biometric Vector Matching against Qdrant FBI Wanted DB.
"""

import time
from typing import Any, Dict
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from services.criminal_interstate.worker import InterstateVisionWorker

app = FastAPI(
    title="Frontier Microservice 04 - Criminal Interstate (FBI)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

worker = InterstateVisionWorker()
START_TIME = time.time()


class InterstateFrameRequest(BaseModel):
    camera_id: str = "CAM-I10-TX-SAN-ANTONIO-04"
    corridor: str = "I-10"
    latitude: float = 29.4241
    longitude: float = -98.4936
    seed_identity: str = "fbi-wanted-suspect-alpha"


@app.get("/healthz")
async def healthz() -> Dict[str, Any]:
    return {
        "service_id": "04-criminal-interstate",
        "name": "Interstate Biometrics & ALPR",
        "port": 8004,
        "status": "ONLINE",
        "ring": "RING_3_INTERSTATE",
        "agencies": ["FBI", "DEA", "STATE_POLICE"],
        "model": "ArcFace-512 + YOLOv8-ALPR (Qdrant Vector Search)",
        "uptime_sec": round(time.time() - START_TIME, 1),
    }


@app.post("/api/v1/infer")
async def infer_camera_frame(req: InterstateFrameRequest) -> Dict[str, Any]:
    t0 = time.perf_counter()
    alert = await worker.process_camera_frame(
        camera_id=req.camera_id,
        corridor=req.corridor,
        latitude=req.latitude,
        longitude=req.longitude,
        seed_identity=req.seed_identity,
    )
    latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    if alert:
        payload = alert.model_dump(mode="json")
        payload["event_type"] = "THREAT_ALERT"
        return {
            "service": "04-criminal-interstate",
            "status": "BIOMETRIC_MATCH_CONFIRMED",
            "latency_ms": latency_ms,
            "alert": payload,
        }

    return {
        "service": "04-criminal-interstate",
        "status": "NO_MATCH",
        "latency_ms": latency_ms,
        "alert": None,
    }
