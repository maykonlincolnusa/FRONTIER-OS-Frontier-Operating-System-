"""
Project Frontier - Tactical C2 Copilot Microservice
Provides Server-Sent Events (SSE) streaming API for AI-assisted command & control.
"""

import json
from fastapi import FastAPI, Request
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


class CopilotChatRequest(BaseModel):
    prompt: str


@app.get("/healthz")
async def healthz():
    return {"status": "HEALTHY", "service": "c2-copilot"}


@app.post("/api/v1/copilot/chat")
async def copilot_chat_stream(request: CopilotChatRequest):
    """
    SSE Streaming endpoint for Tactical Copilot:
    Streams JSON chunks:
    data: {"type": "CONTENT", "chunk": "..."}
    data: {"type": "MAP_ACTION", "action": "FLY_TO", "coordinates": {...}}
    """
    async def event_generator():
        async for chunk in agent.process_command_stream(request.prompt):
            yield f"data: {json.dumps(chunk)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
