"""
Project Frontier - Microservice 02: Airspace Shield (USAF & CBP Air/Marine)
Port: 8002
Executes ADS-B Flight State Autoencoder inference for low-altitude clandestine flights.
"""

import time
from typing import Any, Dict, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from services.airspace_shield.worker import AirspaceWorker

app = FastAPI(
    title="Frontier Microservice 02 - Airspace Shield (USAF / FAA)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

worker = AirspaceWorker()
START_TIME = time.time()


class FlightInferRequest(BaseModel):
    icao24: str = "a81f32"
    callsign: str = "GHOST-09"
    latitude: float = 31.42
    longitude: float = -106.15
    baro_altitude: float = 280.0
    velocity: float = 72.0
    vertical_rate: float = -8.5
    geo_altitude: float = 295.0
    squawk: Optional[str] = "1200"


@app.get("/healthz")
async def healthz() -> Dict[str, Any]:
    return {
        "service_id": "02-airspace-shield",
        "name": "Airspace & Radar Shield",
        "port": 8002,
        "status": "ONLINE",
        "ring": "RING_2_FEDERAL",
        "agencies": ["USAF", "CBP_AMO", "FAA"],
        "model": "airspace_ae.onnx (FlightStateAutoencoder)",
        "uptime_sec": round(time.time() - START_TIME, 1),
    }


@app.post("/api/v1/infer")
async def infer_flight(req: FlightInferRequest) -> Dict[str, Any]:
    t0 = time.perf_counter()
    flight_dict = req.model_dump()
    alert = await worker.evaluate_flight_state(flight_dict)
    latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    if alert:
        payload = alert.model_dump(mode="json")
        payload["event_type"] = "THREAT_ALERT"
        return {
            "service": "02-airspace-shield",
            "status": "ANOMALY_DETECTED",
            "latency_ms": latency_ms,
            "alert": payload,
        }

    return {
        "service": "02-airspace-shield",
        "status": "NOMINAL",
        "latency_ms": latency_ms,
        "alert": None,
    }
