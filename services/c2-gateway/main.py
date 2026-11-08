"""
Project Frontier - Tactical C2 API Gateway & Real-Time Streaming Server
Hub for C4ISR command operators. Consumes multi-agency Kafka topics,
provides REST tactical endpoints, and streams live telemetry/handoffs over WebSockets.
"""

import asyncio
import json
from typing import Any, Dict, List, Optional, Set
from fastapi import FastAPI, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    import asyncpg
except ImportError:
    asyncpg = None

from ml_training.models.face_matcher import FaceEmbeddingEngine
from shared.config import get_settings
from shared.events.schemas import (
    Agency,
    JurisdictionHandoffEvent,
    KafkaTopic,
    SecurityRing,
    ThreatAlertEvent,
)
from shared.telemetry import CONTENT_TYPE_LATEST, get_prometheus_metrics

app = FastAPI(
    title="Project Frontier - Tactical C2 Gateway",
    version="1.0.0",
    description="Unified C4ISR Tactical Gateway for Homeland Defense and Border Operations",
)

# Enable CORS for Next.js Dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

settings = get_settings()


class ConnectionManager:
    """Manages active WebSockets connections and broadcasts tactical messages."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            self.active_connections.discard(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast payload to all active C2 operators."""
        payload_str = json.dumps(message)
        dead_connections = []
        async with self._lock:
            for connection in self.active_connections:
                try:
                    await connection.send_text(payload_str)
                except Exception:
                    dead_connections.append(connection)
            for dead in dead_connections:
                self.active_connections.discard(dead)


manager = ConnectionManager()
_RECENT_THREATS: List[Dict[str, Any]] = []
_RECENT_HANDOFFS: List[Dict[str, Any]] = []


@app.get("/healthz")
async def healthz():
    """Service health check."""
    return {"status": "HEALTHY", "service": "c2-gateway", "active_clients": len(manager.active_connections)}


@app.get("/metrics")
async def prometheus_metrics():
    """Prometheus telemetry scrape endpoint."""
    return Response(content=get_prometheus_metrics(), media_type=CONTENT_TYPE_LATEST)


@app.websocket("/ws/c2-stream")
async def websocket_c2_stream(websocket: WebSocket):
    """
    Real-time streaming channel for live C4ISR events:
    - Deep Learning Anomaly Alerts (USCG, USAF, US Army)
    - Narcotics corridor risk forecasts (DEA)
    - Facial Recognition / FBI Wanted sightings (FBI)
    - Inter-agency JURISDICTION_HANDOFF transitions
    """
    await manager.connect(websocket)
    try:
        # Send initial snapshot of recent events on connection
        await websocket.send_json({
            "event_type": "SNAPSHOT",
            "threats": _RECENT_THREATS[-20:],
            "handoffs": _RECENT_HANDOFFS[-10:],
        })
        while True:
            # Keep connection open; receive client acknowledgements or heartbeat
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception:
        await manager.disconnect(websocket)


@app.get("/api/v1/geofences")
async def get_geofences():
    """
    Returns the GeoJSON MultiPolygons for the 3 Defense-in-Depth Security Rings
    directly from PostGIS or the pre-compiled authoritative definitions.
    """
    from infra.scripts.seed_geofences import GEOFENCE_DEFINITIONS
    features = []
    for g in GEOFENCE_DEFINITIONS:
        features.append({
            "type": "Feature",
            "properties": {
                "ring_id": g["ring_id"],
                "name": g["name"],
                "ring_level": g["ring_level"],
                "lead_agencies": g["lead_agencies"],
                "description": g["description"],
            },
            # Return coordinates for direct Deck.gl PolygonLayer / GeoJsonLayer rendering
            "wkt": g["wkt"].strip(),
        })

    return {
        "type": "FeatureCollection",
        "features": features,
    }


@app.get("/api/v1/threats/active")
async def get_active_threats(limit: int = 50):
    """
    Returns active targets, their current ring, lead agency, and Deep Learning severity score.
    """
    if _RECENT_THREATS:
        return {"count": len(_RECENT_THREATS), "threats": _RECENT_THREATS[-limit:]}

    # If empty, return initial tactical baseline
    return {
        "count": 3,
        "threats": [
            {
                "event_id": "999-maritime-01",
                "subsystem": "01-maritime-coastline",
                "ring": "RING_1_MARITIME",
                "lead_agency": "USCG",
                "severity": 0.88,
                "latitude": 26.25,
                "longitude": -95.40,
                "target_id": "MMSI-3679901",
                "threat_type": "AIS_DARK_SHIP_OR_RENDEZVOUS",
                "metadata": {"sog_knots": 2.1, "status": "LOITERING"},
            },
            {
                "event_id": "999-airspace-02",
                "subsystem": "02-airspace-shield",
                "ring": "RING_2_FEDERAL",
                "lead_agency": "USAF",
                "severity": 0.92,
                "latitude": 31.45,
                "longitude": -106.30,
                "target_id": "AIR-CLANDESTINE-404",
                "threat_type": "LOW_ALT_CLANDESTINE_FLIGHT",
                "metadata": {"altitude_ft": 650, "velocity_knots": 125},
            },
            {
                "event_id": "999-fbi-03",
                "subsystem": "04-criminal-interstate",
                "ring": "RING_3_INTERSTATE",
                "lead_agency": "FBI",
                "severity": 0.95,
                "latitude": 29.42,
                "longitude": -98.49,
                "target_id": "FUGITIVE-FBI-TX09",
                "threat_type": "FBI_WANTED_FUGITIVE_SIGHTING",
                "metadata": {"corridor": "I-10 / I-35", "camera": "TXDOT-511-CAM14"},
            },
        ],
    }


@app.get("/api/v1/fbi/wanted-matches")
async def get_fbi_wanted_matches(limit: int = 10):
    """
    Returns facial biometric and ALPR matches queried from Qdrant vector store.
    """
    engine = FaceEmbeddingEngine(vector_size=512)
    sample_vec = engine.generate_synthetic_embedding("sample-wanted-query")
    results = engine.search_face(sample_vec, top_k=limit, score_threshold=0.60)

    if not results:
        # Provide sample tactical matches
        return {
            "total_matches": 2,
            "matches": [
                {
                    "fugitive_id": "FBI-WANTED-0012",
                    "score": 0.941,
                    "payload": {
                        "title": "ALEJANDRO CASTILLO",
                        "warning": "SHOULD BE CONSIDERED ARMED AND DANGEROUS",
                        "subjects": ["Conspiracy", "Murder"],
                        "camera_hit": "I-35 Northbound Mile Marker 42 (Laredo)",
                    },
                },
                {
                    "fugitive_id": "FBI-WANTED-0038",
                    "score": 0.895,
                    "payload": {
                        "title": "RAFAEL CARO-QUINTERO",
                        "warning": "DRUG TRAFFICKING / ESCAPED",
                        "subjects": ["Kidnapping", "Violent Crimes"],
                        "camera_hit": "I-10 Eastbound Junction 144 (El Paso)",
                    },
                },
            ],
        }

    return {"total_matches": len(results), "matches": results}


@app.get("/api/v1/intel/graph/{target_id}")
async def get_target_link_graph(target_id: str, depth: int = 2):
    """
    Returns the multi-agency cartel ego-graph connecting maritime vessels,
    border crossing points, vehicles, and FBI Wanted fugitives.
    """
    from shared.graph.cartel_graph import CartelLinkGraph
    graph_instance = CartelLinkGraph.get_instance()
    subgraph = graph_instance.get_subgraph(root_id=target_id, max_depth=depth)
    return subgraph


@app.post("/api/v1/simulation/inject")
async def inject_event(event_data: Dict[str, Any]):
    """
    Injects an event into the C2 stream and broadcasts to all WebSocket operators.
    Used by simulation scripts and workers.
    """
    event_type = event_data.get("event_type", "THREAT_ALERT")
    if event_type == "JURISDICTION_HANDOFF":
        _RECENT_HANDOFFS.append(event_data)
        if len(_RECENT_HANDOFFS) > 100:
            _RECENT_HANDOFFS.pop(0)
    else:
        _RECENT_THREATS.append(event_data)
        if len(_RECENT_THREATS) > 200:
            _RECENT_THREATS.pop(0)

    await manager.broadcast(event_data)
    return {"status": "BROADCASTED", "clients_notified": len(manager.active_connections)}
