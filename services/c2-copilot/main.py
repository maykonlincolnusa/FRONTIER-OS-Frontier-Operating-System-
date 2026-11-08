"""
Project Frontier - Microservice 06: Tactical C2 Copilot (Multi-Agent RAG & Text-to-PostGIS)
Port: 8006
Provides Server-Sent Events (SSE) and synchronous inference for AI-assisted command & control.
"""

import json
import time
from typing import Any, Dict
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.c2_copilot.agent import TacticalCopilotAgent

app = FastAPI(
    title="Project Frontier - Tactical C2 Copilot API",
    version="1.0.0",
    description="Multi-Agent RAG & Text-to-PostGIS Copilot with Streaming SSE",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

agent = TacticalCopilotAgent()
START_TIME = time.time()


class CopilotChatRequest(BaseModel):
    prompt: str = "Generate SITREP for all active rings"


@app.get("/healthz")
async def healthz() -> Dict[str, Any]:
    return {
        "service_id": "06-c2-copilot",
        "name": "Multi-Agent Tactical Copilot",
        "port": 8006,
        "status": "ONLINE",
        "ring": "ALL_RINGS",
        "agencies": ["JTF_COMMAND", "USCG", "CBP", "DEA", "FBI"],
        "model": "Multi-Agent RAG + Text-to-PostGIS + GraphRAG",
        "uptime_sec": round(time.time() - START_TIME, 1),
    }


@app.post("/api/v1/infer")
async def copilot_infer(request: CopilotChatRequest) -> Dict[str, Any]:
    t0 = time.perf_counter()
    chunks = []
    async for item in agent.process_command_stream(request.prompt):
        if item.get("type") == "CONTENT":
            chunks.append(item.get("chunk", ""))
    latency_ms = round((time.perf_counter() - t0) * 1000, 2)
    return {
        "service": "06-c2-copilot",
        "status": "SITREP_GENERATED",
        "latency_ms": latency_ms,
        "sitrep": "".join(chunks),
    }


@app.post("/api/v1/copilot/chat")
async def copilot_chat_stream(request: CopilotChatRequest):
    async def event_generator():
        async for chunk in agent.process_command_stream(request.prompt):
            yield f"data: {json.dumps(chunk)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
