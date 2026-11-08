"""
Project Frontier - Microservice 01: Maritime & Coastline Shield (USCG & US Navy)
Port: 8001
Executes AIS Trajectory Anomaly LSTM inference via isolated Multiprocessing Pool.
"""

import time
from typing import Any, Dict, List, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from services.maritime_coastline.worker import MaritimeWorker

app = FastAPI(
    title="Frontier Microservice 01 - Maritime Coastline (USCG / US Navy)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

worker = MaritimeWorker()
START_TIME = time.time()


class AISInferRequest(BaseModel):
    mmsi: str = "367991042"
    positions: Optional[List[Dict[str, Any]]] = None


@app.get("/healthz")
async def healthz() -> Dict[str, Any]:
    return {
        "service_id": "01-maritime-coastline",
        "name": "Maritime & Blue Border Shield",
        "port": 8001,
        "status": "ONLINE",
        "ring": "RING_1_MARITIME",
        "agencies": ["USCG", "US_NAVY"],
        "model": "maritime_lstm.onnx (TrajectoryAnomalyLSTM)",
        "uptime_sec": round(time.time() - START_TIME, 1),
    }


@app.post("/api/v1/infer")
async def infer_ais(req: AISInferRequest) -> Dict[str, Any]:
    t0 = time.perf_counter()
    positions = req.positions or [
        {"latitude": 24.45, "longitude": -81.80, "sog": 18.5, "cog": 340.0, "delta_t": 120.0},
        {"latitude": 24.80, "longitude": -82.10, "sog": 1.2, "cog": 15.0, "delta_t": 900.0},
        {"latitude": 25.10, "longitude": -82.35, "sog": 0.4, "cog": 195.0, "delta_t": 1800.0},
    ]
    alert = await worker.process_ais_trajectory(req.mmsi, positions)
    latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    if alert:
        payload = alert.model_dump(mode="json")
        payload["event_type"] = "THREAT_ALERT"
        return {
            "service": "01-maritime-coastline",
            "status": "ANOMALY_DETECTED",
            "latency_ms": latency_ms,
            "alert": payload,
        }

    return {
        "service": "01-maritime-coastline",
        "status": "NOMINAL",
        "latency_ms": latency_ms,
        "alert": None,
    }
