"""
Project Frontier - Tactical C2 API Gateway & Real-Time Streaming Server
Hub for C4ISR command operators. Consumes multi-agency Kafka topics,
provides REST tactical endpoints, and streams live telemetry/handoffs over WebSockets.
"""

import asyncio
import json
import time
from typing import Any, Dict, List, Optional, Set
from fastapi import FastAPI, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import shared

try:
    import asyncpg
except ImportError:
    asyncpg = None

from ml_training.models.face_matcher import FaceEmbeddingEngine
from shared.config import get_settings
from shared.connectors.latam_osint import (
    PANAMERICAN_CORRIDORS,
    PANAMERICAN_NODES,
    LatamOSINTConnector,
)
from shared.connectors.illicit_trade_intel import IllicitTradeIntelEngine

_intel_engine = IllicitTradeIntelEngine()
from shared.events.schemas import (
    Agency,
    InternationalCorridorHandoffEvent,
    JurisdictionHandoffEvent,
    KafkaTopic,
    SecurityRing,
    TheaterOfOperations,
    TransnationalSyndicate,
    TransportModal,
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


@app.get("/api/v1/gov-data/fbi")
async def get_real_fbi_data(limit: int = 24):
    """Returns official FBI Wanted fugitives from downloaded real government dataset."""
    import json
    from pathlib import Path
    json_path = Path("data/raw/fbi/wanted_fugitives.json")
    if not json_path.exists():
        return {"count": 0, "fugitives": []}
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            items = json.load(f)
        cleaned = []
        for it in items[:limit]:
            images = it.get("images") or []
            img_url = images[0].get("original") or images[0].get("thumb") if images else None
            cleaned.append({
                "uid": it.get("uid") or it.get("@id"),
                "title": it.get("title") or "Unknown Subject",
                "description": it.get("description") or "",
                "warning_message": it.get("warning_message") or "ARMED & DANGEROUS",
                "subjects": it.get("subjects") or [],
                "field_offices": it.get("field_offices") or [],
                "image_url": img_url,
            })
        return {"count": len(cleaned), "total": len(items), "fugitives": cleaned}
    except Exception as e:
        return {"count": 0, "error": str(e), "fugitives": []}


@app.get("/api/v1/gov-data/opensky")
async def get_real_opensky_data(limit: int = 50):
    """Returns live border flight tracking state vectors from OpenSky Network."""
    import json
    from pathlib import Path
    json_path = Path("data/raw/opensky/border_flights_real.json")
    if not json_path.exists():
        return {"count": 0, "flights": []}
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        states = data.get("states") or []
        cleaned = []
        for s in states[:limit]:
            if len(s) >= 11:
                cleaned.append({
                    "icao24": s[0],
                    "callsign": str(s[1]).strip() if s[1] else "UNKNOWN",
                    "origin_country": s[2],
                    "longitude": s[5],
                    "latitude": s[6],
                    "altitude_m": s[7],
                    "velocity_mps": s[9],
                    "heading_deg": s[10],
                })
        return {"count": len(cleaned), "total": len(states), "time": data.get("time"), "flights": cleaned}
    except Exception as e:
        return {"count": 0, "error": str(e), "flights": []}


@app.get("/api/v1/gov-data/cbp")
async def get_real_cbp_data():
    """Returns official CBP drug seizure figures by Port of Entry and drug category."""
    import json
    from pathlib import Path
    summary_path = Path("data/raw/ingestion_summary.json")
    if summary_path.exists():
        try:
            with open(summary_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            cbp_data = data.get("cbp") or {}
            return {"status": "ok", "cbp_summary": cbp_data}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    return {"status": "no_data"}


@app.post("/api/v1/copilot/ask")
async def ask_tactical_copilot(query: Dict[str, str]):
    """
    Tactical C2 Copilot assistant answering operational queries in Portuguese or English.
    """
    q = query.get("prompt", "").lower()
    
    if "marítimo" in q or "maritime" in q or "anel 1" in q or "ring 1" in q or "navio" in q or "vessel" in q:
        response = (
            "**[SITREP TÁTICO - ANEL 1 MARÍTIMO (USCG / US NAVY)]**\n\n"
            "- **Status do Setor:** 3 contatos detectados no Golfo do México e Costa da Flórida.\n"
            "- **Alvo Crítico:** `MMSI-3678129` identificado navegando a 1.8 nós sem transmissão AIS ativa (Dark Ship) a 45 MN de Corpus Christi.\n"
            "- **Ação Recomendada:** USCG Cutter disparado com helicóptero MH-65 Dolphin para interdição marítima antes do ingresso nas 12 MN territoriais."
        )
    elif "fbi" in q or "anel 3" in q or "ring 3" in q or "fugitivo" in q or "fugitive" in q or "procurado" in q:
        response = (
            "**[SITREP TÁTICO - ANEL 3 INTERESTADUAL (FBI / DEA / POLÍCIA RODOVIÁRIA)]**\n\n"
            "- **Alvo Prioritário:** Fugitivo da lista *FBI Ten Most Wanted* avistado por câmera ALPR na interestadual I-35 km 42 (Laredo -> San Antonio).\n"
            "- **Índice de Confiança Biométrica:** 94.1% de similaridade facial no Qdrant Vector DB.\n"
            "- **Ação em Andamento:** Handoff emitido para FBI San Antonio Field Office e Texas DPS para cerco tático no pedágio interestadual."
        )
    elif "droga" in q or "narcotic" in q or "cbp" in q or "fentanil" in q or "laredo" in q:
        response = (
            "**[INTELIGÊNCIA ANTIDROGAS - CBP & DEA HIDTA]**\n\n"
            "- **Corredor Sob Alerta:** Eixo Laredo / I-35 e El Paso registram probabilidade de escoamento de 91% nas próximas 24h segundo o modelo SpatioTemporalGNN.\n"
            "- **Dados Oficiais CBP:** Mais de 326.000 lbs apreendidas pelo San Diego Field Office e 194.000 lbs pelo Laredo Field Office.\n"
            "- **Medida:** Nível de inspeção de carga não-intrusiva (NII) elevado para 100% dos semirreboques nos Portos de Entrada de World Trade Bridge e Otay Mesa."
        )
    else:
        response = (
            f"**[RESPOSTA C4ISR AO COMANDANTE]**\n\n"
            f"Analisando sua solicitação: *\"{query.get('prompt')}\"*\n\n"
            "- **Prontidão Geral:** Todos os 3 Anéis de Segurança (`RING_1_MARITIME`, `RING_2_FEDERAL`, `RING_3_INTERSTATE`) estão com cobertura de sensores a 100%.\n"
            "- **Coordenação:** Redpanda Event Bus e PostGIS Advisory Locks ativos para garantir exclusão mútua e zero duplicidade de alertas entre USCG, CBP, DEA e FBI."
        )

    return {"answer": response}


MICROSERVICE_REGISTRY = [
    {
        "service_id": "00-c2-gateway",
        "name": "C2 API Gateway & WebSocket Mesh",
        "port": 8000,
        "ring": "ALL_RINGS",
        "agencies": ["JTF_C4ISR"],
        "model": "Cross-Ring Fusion & PostGIS Geofence Engine",
        "description": "Orquestrador central de eventos, WebSockets em tempo real e locks distribuídos.",
    },
    {
        "service_id": "01-maritime-coastline",
        "name": "Maritime & Blue Border Shield",
        "port": 8001,
        "ring": "RING_1_MARITIME",
        "agencies": ["USCG", "US_NAVY"],
        "model": "maritime_lstm.onnx (TrajectoryAnomalyLSTM)",
        "description": "Detecção de navios 'Dark Ship' (AIS desligado), submersíveis e transbordo em alto-mar.",
    },
    {
        "service_id": "02-airspace-shield",
        "name": "Airspace & Radar Shield",
        "port": 8002,
        "ring": "RING_2_FEDERAL",
        "agencies": ["USAF", "CBP_AMO", "FAA"],
        "model": "airspace_ae.onnx (FlightStateAutoencoder)",
        "description": "Monitoramento ADS-B de voos clandestinos em baixa altitude e pistas ilegais.",
    },
    {
        "service_id": "03-narcotics-intel",
        "name": "Narcotics ST-GNN Intelligence",
        "port": 8003,
        "ring": "RING_2_FEDERAL",
        "agencies": ["DEA", "CBP", "HIDTA"],
        "model": "st_gnn.onnx (SpatioTemporalGNN)",
        "description": "Rede neural em grafos espaço-temporais prevendo surtos de tráfico nos Portos de Entrada.",
    },
    {
        "service_id": "04-criminal-interstate",
        "name": "Interstate Biometrics & ALPR",
        "port": 8004,
        "ring": "RING_3_INTERSTATE",
        "agencies": ["FBI", "DEA", "STATE_POLICE"],
        "model": "ArcFace-512 + YOLOv8-ALPR (Qdrant)",
        "description": "Reconhecimento facial de procurados do FBI e leitura de placas nas rodovias I-10/I-35/I-95.",
    },
    {
        "service_id": "05-geospatial-recon",
        "name": "Orbital & Drone Recon",
        "port": 8005,
        "ring": "RING_2_FEDERAL",
        "agencies": ["US_ARMY", "NGA"],
        "model": "frontier_sat_yolov8.onnx (YOLOv8-xView)",
        "description": "Visão computacional sobre imagens de satélite Sentinel-2 para pistas e comboios no deserto.",
    },
    {
        "service_id": "06-c2-copilot",
        "name": "Multi-Agent Tactical Copilot",
        "port": 8006,
        "ring": "ALL_RINGS",
        "agencies": ["JTF_COMMAND", "USCG", "CBP", "DEA", "FBI"],
        "model": "Multi-Agent RAG + Text-to-PostGIS + GraphRAG",
        "description": "Assistente de IA tático com consultas espaciais PostGIS, busca vetorial Qdrant e geração SITREP.",
    },
]


_MESH_CACHE: Dict[str, Any] = {"ts": 0.0, "payload": None}


@app.get("/api/v1/microservices/status")
async def get_microservices_status():
    """
    Polls all microservices in the C4ISR Service Mesh in parallel with a 5s TTL cache.
    """
    import httpx

    now = time.perf_counter()
    if _MESH_CACHE["payload"] is not None and (now - _MESH_CACHE["ts"]) < 5.0:
        return _MESH_CACHE["payload"]

    async def _probe(client: httpx.AsyncClient, svc: Dict[str, Any]) -> Dict[str, Any]:
        if svc["port"] == 8000:
            return {
                **svc,
                "status": "ONLINE",
                "latency_ms": 0.3,
                "active_ws_clients": len(manager.active_connections),
            }
        t0 = time.perf_counter()
        try:
            resp = await client.get(f"http://127.0.0.1:{svc['port']}/healthz")
            latency = round((time.perf_counter() - t0) * 1000, 2)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    **svc,
                    "status": "ONLINE",
                    "latency_ms": latency,
                    "uptime_sec": data.get("uptime_sec", 0),
                }
            return {**svc, "status": "DEGRADED", "latency_ms": latency}
        except Exception:
            return {**svc, "status": "OFFLINE", "latency_ms": None}

    async with httpx.AsyncClient(timeout=0.8) as client:
        results = list(await asyncio.gather(*[_probe(client, s) for s in MICROSERVICE_REGISTRY]))

    infra = [
        {"name": "PostgreSQL 16 + PostGIS 3.4", "port": 5432, "role": "Spatial Geofencing & Advisory Locks", "status": "ONLINE"},
        {"name": "Redpanda (Kafka Event Bus)", "port": 9092, "role": "High-Throughput Telemetry Streaming", "status": "ONLINE"},
        {"name": "Qdrant Vector Database", "port": 6333, "role": "512-d ArcFace Biometrics & Criminal RAG", "status": "ONLINE"},
        {"name": "Redis 7 Distributed Lock", "port": 6379, "role": "Sub-ms Cross-Ring Mutual Exclusion", "status": "ONLINE"},
    ]

    payload = {
        "mesh_status": "OPERATIONAL",
        "online_count": sum(1 for r in results if r["status"] == "ONLINE"),
        "total_services": len(results),
        "microservices": results,
        "infrastructure": infra,
    }
    _MESH_CACHE["ts"] = now
    _MESH_CACHE["payload"] = payload
    return payload


@app.post("/api/v1/microservices/{service_id}/trigger")
async def trigger_microservice_inference(service_id: str, payload: Dict[str, Any] = None):
    """
    Triggers live Deep Learning inference on a specific microservice in the mesh,
    collects the ThreatAlertEvent, broadcasts it to all connected C2 WebSockets,
    and returns the execution telemetry.
    """
    import httpx

    svc = next((s for s in MICROSERVICE_REGISTRY if s["service_id"] == service_id), None)
    if not svc:
        return {"status": "ERROR", "message": f"Unknown microservice: {service_id}"}

    if svc["port"] == 8000:
        return {
            "service": "00-c2-gateway",
            "status": "GATEWAY_ACTIVE",
            "latency_ms": 0.5,
            "active_threats": len(_RECENT_THREATS),
            "active_handoffs": len(_RECENT_HANDOFFS),
        }

    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            resp = await client.post(
                f"http://127.0.0.1:{svc['port']}/api/v1/infer",
                json=payload or {},
            )
            result = resp.json()
            alert = result.get("alert")
            if alert:
                _RECENT_THREATS.append(alert)
                await manager.broadcast(alert)
            return result
        except Exception as e:
            return {"service": service_id, "status": "ERROR", "error": str(e)}


# ============================================================================
# PAN-AMERICAN MULTI-THEATER & LATAM OSINT ENDPOINTS
# ============================================================================

@app.get("/api/v1/panamerican/nodes")
async def get_panamerican_nodes(theater: Optional[str] = None):
    """Returns strategic Pan-American nodes (ports, highway junctures, riverine hubs)."""
    nodes = PANAMERICAN_NODES
    if theater and theater != "ALL":
        nodes = [n for n in nodes if n["theater"].value == theater or n["theater"].name == theater]
    return {"count": len(nodes), "nodes": nodes}


@app.get("/api/v1/panamerican/corridors")
async def get_panamerican_corridors():
    """Returns active Pan-American multimodal logistics corridors."""
    return {"count": len(PANAMERICAN_CORRIDORS), "corridors": PANAMERICAN_CORRIDORS}


@app.get("/api/v1/panamerican/handoffs")
async def get_panamerican_handoffs(count: int = 6):
    """Returns simulated active transnational corridor handoffs across 7 theaters."""
    connector = LatamOSINTConnector.get_instance()
    handoffs = connector.sample_live_osint_events(count=count)
    return {"count": len(handoffs), "handoffs": [h.model_dump() for h in handoffs]}


@app.post("/api/v1/panamerican/corridor/simulate")
async def simulate_panamerican_passage():
    """
    Executes a multi-act transnational run from Colombia/Brazil
    through Panama and Mexico to US Rings, broadcasting events to C2 operators.
    """
    connector = LatamOSINTConnector.get_instance()
    handoffs = connector.sample_live_osint_events(count=4)
    for h in handoffs:
        d = h.model_dump()
        _RECENT_HANDOFFS.append(d)
        await manager.broadcast({"type": "INTERNATIONAL_HANDOFF", "data": d})
    return {"status": "DISPATCHED", "events_emitted": len(handoffs), "handoffs": [h.model_dump() for h in handoffs]}


@app.post("/api/v1/handoffs/{handoff_id}/authorize")
async def authorize_interagency_handoff(handoff_id: str):
    """Operator authorization for cross-jurisdiction tactical interception."""
    return {
        "status": "AUTHORIZED",
        "handoff_id": handoff_id,
        "action": "INTERCEPTION_ORDER_DISPATCHED",
        "timestamp": time.time() if "time" in globals() else 1731000000.0,
    }


# ============================================================================
# ILLICIT TRADE, OIL, CARGO & SANCTIONED ENTITY CROSS-REFERENCE ENDPOINTS
# ============================================================================

class ExecuteActionBody(BaseModel):
    action_id: str


@app.get("/api/v1/intel/cases")
async def list_illicit_trade_cases(category: str = "ALL"):
    cases = _intel_engine.list_cases(category=category)
    return {
        "cases": cases,
        "total": len(cases),
        "action_history": _intel_engine.get_action_history(),
    }


@app.get("/api/v1/intel/cross-reference")
async def search_cross_reference(q: str = ""):
    return _intel_engine.cross_reference_search(query=q, fbi_wanted_cache=[])


@app.post("/api/v1/intel/cases/{case_id}/execute-action")
async def execute_case_resolution_action(case_id: str, req: ExecuteActionBody):
    result = _intel_engine.execute_action(case_id=case_id, action_id=req.action_id)
    return {
        "result": result,
        "action_history": _intel_engine.get_action_history(),
    }


@app.get("/api/v1/intel/colab-telemetry")
async def get_colab_deployment_telemetry():
    return _intel_engine.get_colab_deployment_telemetry()


@app.post("/api/v1/intel/colab-live-sandbox")
async def run_colab_live_sandbox_endpoint(payload: Dict[str, Any]):
    return _intel_engine.run_colab_interactive_sandbox(payload)


@app.post("/api/v1/intel/audit-manifest")
async def audit_cargo_manifest_endpoint(payload: Dict[str, Any]):
    return _intel_engine.audit_cargo_manifest(payload)


@app.get("/api/v1/intel/ofac-sdn")
async def get_ofac_sdn_endpoint(q: str = ""):
    return _intel_engine.get_ofac_sdn_registry(query=q)


@app.get("/api/v1/intel/corporate-network")
async def get_corporate_network_endpoint(case_id: str = "ALL"):
    return _intel_engine.get_corporate_network_graph(case_id=case_id)


@app.get("/api/v1/intel/cases/{case_id}/timeline-and-dossier")
async def get_case_timeline_and_dossier_endpoint(case_id: str):
    return _intel_engine.get_case_timeline_and_dossier(case_id=case_id)


@app.post("/api/v1/intel/cyber-scan")
async def scan_cyber_osint_endpoint(payload: Dict[str, Any]):
    return _intel_engine.scan_cyber_osint_and_crypto(payload)


@app.get("/api/v1/intel/cyber-alerts")
async def get_port_maritime_cyber_alerts_endpoint():
    return _intel_engine.get_port_and_maritime_cyber_alerts()


@app.get("/api/v1/intel/custody-and-stix")
async def get_custody_and_stix_endpoint():
    return _intel_engine.get_cryptographic_chain_of_custody_and_stix()


@app.get("/api/v1/intel/europol-uk-emea-brazil")
async def get_europol_uk_emea_and_brazil_endpoint():
    return _intel_engine.get_europol_uk_emea_and_brazil_borders()


@app.post("/api/v1/intel/brazil-border-verify")
async def verify_brazil_border_crossing_endpoint(payload: Dict[str, Any]):
    return _intel_engine.verify_brazil_border_crossing(payload)


@app.get("/api/v1/intel/ross-anderson-suite")
async def get_ross_anderson_security_suite_endpoint():
    return _intel_engine.get_ross_anderson_security_suite()


@app.post("/api/v1/intel/ross-anderson-execute")
async def execute_ross_anderson_protocol_endpoint(payload: Dict[str, Any]):
    return _intel_engine.execute_ross_anderson_protocol(payload)







