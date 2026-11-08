"""
Project Frontier - Microservice 03: Narcotics Intelligence (DEA, CBP & HIDTA)
Port: 8003
Executes Spatio-Temporal GNN (ST-GNN) over Ports of Entry and Interstate Corridors.
"""

import time
from typing import Any, Dict
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from services.narcotics_intel.worker import NarcoticsIntelWorker

app = FastAPI(
    title="Frontier Microservice 03 - Narcotics Intelligence (DEA / CBP)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

worker = NarcoticsIntelWorker()
START_TIME = time.time()


class NarcoticsInferRequest(BaseModel):
    historical_days: int = 7


@app.get("/healthz")
async def healthz() -> Dict[str, Any]:
    return {
        "service_id": "03-narcotics-intel",
        "name": "Narcotics ST-GNN Intelligence",
        "port": 8003,
        "status": "ONLINE",
        "ring": "RING_2_FEDERAL",
        "agencies": ["DEA", "CBP", "HIDTA"],
        "model": "st_gnn.onnx (SpatioTemporalGNN)",
        "uptime_sec": round(time.time() - START_TIME, 1),
    }


@app.post("/api/v1/infer")
async def infer_corridors(req: NarcoticsInferRequest) -> Dict[str, Any]:
    t0 = time.perf_counter()
    alerts = await worker.predict_corridor_risks(historical_days=req.historical_days)
    latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    serialized = []
    for a in alerts:
        d = a.model_dump(mode="json")
        d["event_type"] = "THREAT_ALERT"
        serialized.append(d)

    top_alert = serialized[0] if serialized else None
    return {
        "service": "03-narcotics-intel",
        "status": "HOTSPOTS_PREDICTED" if serialized else "NOMINAL",
        "latency_ms": latency_ms,
        "hotspots_count": len(serialized),
        "alert": top_alert,
        "all_alerts": serialized,
    }
