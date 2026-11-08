# PROJECT FRONTIER (FRONTIER-C4ISR) - System of Systems Architecture

> **AI AGENT DIRECTIVE (Google Antigravity / Gemini CLI):**
> This file is the Single Source of Truth (SSOT) for Project Frontier. Before creating or modifying any microservice, database schema, or AI pipeline, strictly follow the directory layout, technology stack, event contracts, and jurisdictional rules defined below.

---

## 1. System of Systems (SoS) Overview
**Project Frontier** is a unified C4ISR (*Command, Control, Communications, Computers, Intelligence, Surveillance, and Reconnaissance*) platform designed for United States territorial integrity and multi-agency border enforcement. The system federates operational intelligence from 7 Pan-American partner nations (USA, Brazil, Colombia, Mexico, Panama, Chile, and Argentina) and integrates real public data from federal, defense, and law enforcement agencies with real-time Deep Learning models.

### 1.1. The 3 Defense-in-Depth Security Rings (Hierarchical Geofencing)
Target tracking operates under a **Defense-in-Depth** doctrine. When an entity (vessel, aircraft, ground vehicle, or individual) crosses from one jurisdictional polygon to another in **PostGIS**, the system automatically emits a `JURISDICTION_HANDOFF` event to **Kafka / Redpanda**:

1. **RING 1 - MARITIME & BLUE BORDER (Outer Ring):**
   * **Geometry:** Territorial Sea (12 NM), Contiguous Zone (24 NM), and Exclusive Economic Zone (EEZ, 200 NM).
   * **Agencies:** USCG (Coast Guard) & US Navy.
   * **Transition:** Maritime targets beaching or mooring outside designated official ports trigger `JURISDICTION_HANDOFF` -> `RING_2_FEDERAL`.
2. **RING 2 - FEDERAL LAND & AIR BORDER (Main Ring):**
   * **Geometry:** Land borders (US-Mexico / US-Canada 100-mile statutory zone), Sovereign Airspace, and official Ports of Entry (POEs).
   * **Agencies:** CBP, US Army, USAF, FAA, NGA.
   * **Transition:** Ground threats breaching federal checkpoints and entering interstate transit networks trigger `JURISDICTION_HANDOFF` -> `RING_3_INTERSTATE`.
3. **RING 3 - INTERSTATE & INTERNAL CORRIDORS (Inner Ring):**
   * **Geometry:** Boundaries across the 50 US states and strategic interstate transit corridors (Interstates I-10, I-35, I-95).
   * **Agencies:** FBI, DEA, USDOT, State Troopers.

---

## 2. Pan-American Multi-Theater Expansion & Transnational Syndicates

### 2.1. The 7 Theaters of Operations (`TheaterOfOperations`)
* **`USA`:** Homeland security perimeters (Ring 1 Maritime, Ring 2 Federal Border, Ring 3 Interstate Corridors).
* **`BRAZIL`:** Atlantic export seaports (Santos, Paranaguá), highway junctures (BR-277, BR-163), and Amazon basin (Tabatinga / Solimões).
* **`COLOMBIA`:** Pacific littoral launch pads (Tumaco, Buenaventura) and Caribbean gateways (Golfo de Urabá).
* **`MEXICO`:** Pacific precursor container hubs (Manzanillo) and land border ports of entry (Nuevo Laredo / World Trade Bridge).
* **`PANAMA`:** Panama Canal inter-oceanic bottleneck (Balboa Pacific terminal & Colón Atlantic free zone).
* **`CHILE`:** Southern Pacific container gateway (San Antonio / Valparaíso).
* **`ARGENTINA`:** Hidrovía Paraná-Paraguay bulk riverine shipping corridor (Port of Rosario).

### 2.2. Transnational Syndicates & Multimodal Conveyance
* **Syndicates:**
  * `PCC` (Primeiro Comando da Capital - Rota Caipira, Santos Atlantic container export, Paraná-Paraguay riverine route).
  * `CV` (Comando Vermelho - Solimões Amazon basin, clandestine air corridors).
  * `SINALOA_CARTEL` (Pacific corridor, commercial trucking via Nuevo Laredo / I-35).
  * `CJNG` (Cartel Jalisco Nueva Generación - Manzanillo precursor import, fentanyl processing).
  * `CLAN_DEL_GOLFO` (Tumaco / Urabá littoral, Low Profile Vessels & semi-submersibles).
  * `TREN_DE_ARAGUA` (Cone Sur & Andean corridor exploitation).
* **Transport Modals:**
  * `MARITIME_CONTAINER` (Rip-on / rip-off container tampering).
  * `SEMI_SUBMERSIBLE` (Fully submersible and Low Profile Vessels - LPVs).
  * `RIVERINE_BARGE` (Hidrovía Paraná-Paraguay & Solimões river convoys).
  * `CLANDESTINE_AIRCRAFT` (Low-altitude, radar-evading cross-border flights).
  * `HIGHWAY_FREIGHT` (Commercial tractor-trailers traversing interstate arteries).
  * `PANAMA_CANAL_TRANSIT` (Inter-oceanic transshipment through Miraflores / Cocolí locks).

### 2.3. Expanded Inter-Agency Roster
* **United States:** `USCG`, `US_NAVY`, `USAF`, `US_ARMY`, `CBP`, `DEA`, `FBI`, `USDOT`, `STATE_TROOPERS`.
* **Pan-American Partners:**
  * `PF_BR` (Polícia Federal - Brazil)
  * `PRF_BR` (Polícia Rodoviária Federal - Brazil)
  * `ANTAQ_BR` (Agência Nacional de Transportes Aquaviários - Brazil)
  * `MARINHA_BR` (Marinha do Brasil)
  * `FAB_BR` (Força Aérea Brasileira)
  * `ARMADA_CO` (Armada Nacional de la República de Colombia)
  * `ACP_PA` (Autoridad del Canal de Panamá)
  * `DIRECTEMAR_CL` (Dirección General del Territorio Marítimo - Chile)
  * `PREFECTURA_AR` (Prefectura Naval Argentina)
  * `INTERPOL` (International Criminal Police Organization)

---

## 3. Mandatory Technology Stack
* **Backend & AI Language:** Python 3.12+ (`uv` package manager).
* **API Frameworks:** FastAPI (100% async), Pydantic v2, SQLAlchemy 2.0 (`asyncpg`) + GeoAlchemy2.
* **Deep Learning & Inference:** PyTorch 2.x, ONNX Runtime, HuggingFace Transformers.
* **Spatial Sharding & Indexing:** Uber H3 Spatial Index (hex resolutions 4, 6, 8) for $O(1)$ memory pre-screening before PostGIS `ST_Contains`.
* **Event Bus:** Redpanda / Apache Kafka (via `aiokafka`).
* **Elastic Autoscaling:** Kubernetes Event-Driven Autoscaling (KEDA) scaling pods from 1 to 10 replicas based on consumer lag.
* **Databases:**
  * **PostgreSQL 16 + PostGIS 3.4:** Spatio-temporal telemetry and 3-Ring Geofencing.
  * **Qdrant:** Vector database for facial recognition (ArcFace 512-dim) and intelligence embeddings.
  * **Redis 7:** C2 real-time state caching and distributed concurrency locks.
* **Frontend (C2 Dashboard):** Next.js 14 (React + TypeScript), TailwindCSS, Leaflet + Deck.gl with 3-Level Semantic Zoom.

---

## 4. Monorepo Directory Architecture (`FRONTIER-OS`)

```text
FRONTIER-OS/
├── ARCHITECTURE.md                 # System of Systems Architecture (SSOT)
├── README.md                       # Presentation & Quickstart Guide
├── docker-compose.yml              # PostGIS, Redpanda (Kafka), Qdrant, Redis
├── pyproject.toml                  # Python 3.12+ dependencies (uv)
├── shared/                         # Shared core package across all subsystems
│   ├── concurrency/                # InferenceProcessPool (spawn, locks, backpressure)
│   ├── connectors/                 # LatamOSINTConnector (Brazil, Colombia, Panama, Cone Sur)
│   ├── events/                     # Pydantic v2 event contracts (Kafka schemas)
│   ├── geo/                        # PostGIS geofencing & H3SpatialIndex (Uber H3 sharding)
│   └── config/                     # Centralized settings (Pydantic Settings)
├── services/                       # Autonomous domain microservices (Ports 8000–8006)
│   ├── 01-maritime-coastline/      # Port 8001: USCG & Navy AIS Ingestion & Trajectory LSTM
│   ├── 02-airspace-shield/         # Port 8002: USAF & FAA ADS-B Vectors & Flight Autoencoder
│   ├── 03-narcotics-intel/         # Port 8003: DEA & CBP Seizures & SpatioTemporalGNN
│   ├── 04-criminal-interstate/     # Port 8004: FBI Wanted & ArcFace Facial Recognition
│   ├── 05-geospatial-recon/        # Port 8005: US Army & NGA Satellite Recon & YOLOv8
│   ├── c2-gateway/                 # Port 8000: Tactical Gateway, Pan-American APIs & WebSockets
│   └── c2-copilot/                 # Port 8006: Multi-Agent Tactical RAG Copilot
├── ml-training/                    # Training pipelines, datasets, and ONNX weights
├── notebooks/colab/                # Production Google Colab GPU training notebooks (.ipynb)
├── infra/
│   ├── keda/                       # KEDA Kafka ScaledObject (1 to 10 replicas auto-scaling)
│   ├── postgres/init-postgis.sql   # Spatial tables and 3-Ring Geofence initialization
│   └── oci-oke/                    # Kubernetes deployment manifests
├── dashboard-c2/                   # Next.js 14 Tactical Command & Control interface
├── scripts/
│   ├── simulate_panamerican_corridor.py  # Multi-act Pan-American corridor simulation
│   └── start_microservices_mesh.py       # Supervisor launching all 7 microservices
└── tests/                          # Automated Pytest suite (31 unit/integration tests)
```

---

## 5. Event Bus Standard Contracts (Pydantic / Kafka JSON)

All microservices emit events following these standard contracts in `shared/events/schemas.py`:

```python
class InternationalCorridorHandoffEvent(FrontierBaseEvent):
    """
    Emitted when suspicious cargo, vessel, aircraft, or syndicate entity crosses
    between Pan-American Theaters of Operations (e.g. Brazil -> Panama -> Mexico -> USA).
    """
    handoff_id: UUID = Field(default_factory=uuid4)
    timestamp: datetime = Field(default_factory=utc_now)
    target_id: str
    syndicate: TransnationalSyndicate
    modal: TransportModal
    origin_theater: TheaterOfOperations
    destination_theater: TheaterOfOperations
    from_agency: Agency
    to_agency: Agency
    chokepoint: str
    cargo_manifest: dict[str, Any] = Field(default_factory=dict)
    risk_score: float = Field(..., ge=0.0, le=1.0)
    latitude: float
    longitude: float
    operational_summary: str
```

---

## 6. Phased Execution Roadmap
* **Phase 1 (Infra & Core):** Directory scaffolding, `shared/` package, `docker-compose.yml`, and PostGIS 3-Ring initialization script with spatial indexes.
* **Phase 2 (Datasets & Deep Learning):** Real public API clients (FBI Wanted + OpenSky Network), Flight Autoencoder, Maritime Bi-GRU, Qdrant facial vector search, and Google Colab GPU training suite.
* **Phase 3 (Geofencing & Handoff Engine):** Real-time spatial engine detecting border crossings and emitting `JurisdictionHandoffEvent`.
* **Phase 4 (Deep Learning Perception & Microservices Mesh):** 7 independent microservices (ports 8000–8006), `InferenceProcessPool` multiprocessing isolation, and C2 Gateway.
* **Phase 5 (Pan-American Transnational Expansion, Elasticity & Tactical UX):**
  * 7 Pan-American Theaters & Transnational Syndicate tracking (PCC, CV, Sinaloa, CJNG, Clan del Golfo).
  * Latin American OSINT telemetry connectors (`shared/connectors/latam_osint.py`).
  * Uber H3 Spatial Sharding (`shared/geo/h3_index.py`, resolutions 4, 6, 8) bypassing PostGIS in $O(1)$.
  * KEDA event-driven autoscaling (`infra/keda/kafka-scaledobject.yaml`, 1 to 10 replicas on consumer lag).
  * 3-Level Semantic Zoom Command Center UX (Strategic, Operational, Tactical) in Next.js + Leaflet.
  * End-to-end Pan-American simulation script (`scripts/simulate_panamerican_corridor.py`).
