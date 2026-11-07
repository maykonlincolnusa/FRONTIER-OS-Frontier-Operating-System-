# PROJECT FRONTIER (FRONTIER-C4ISR) - System of Systems Architecture

> **AI AGENT DIRECTIVE (Google Antigravity / Gemini CLI):**
> This file is the Single Source of Truth (SSOT) for Project Frontier. Before creating or modifying any microservice, database schema, or AI pipeline, strictly follow the directory layout, technology stack, event contracts, and jurisdictional rules defined below.

---

## 1. System of Systems (SoS) Overview
**Project Frontier** is a unified C4ISR (*Command, Control, Communications, Computers, Intelligence, Surveillance, and Reconnaissance*) platform designed for United States territorial integrity and multi-agency border enforcement. The system integrates real public data from multiple federal and military agencies (USCG, US Navy, USAF, FAA, US Army, NGA, CBP, DEA, FBI, and USDOT) with real-time Deep Learning models.

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

## 2. Mandatory Technology Stack
* **Backend & AI Language:** Python 3.12+ (`uv` package manager).
* **API Frameworks:** FastAPI (100% async), Pydantic v2, SQLAlchemy 2.0 (`asyncpg`) + GeoAlchemy2.
* **Deep Learning & Computer Vision:** PyTorch 2.x, PyTorch XLA (Google Cloud TPU v2/v3/v4/v5e), ONNX Runtime, HuggingFace Transformers.
* **Event Bus:** Redpanda / Apache Kafka (via `aiokafka`).
* **Databases:**
  * **PostgreSQL 16 + PostGIS 3.4:** Relational data, spatio-temporal telemetry, and 3-Ring Geofencing.
  * **Qdrant:** Vector database for facial recognition (ArcFace) and semantic intelligence reports (FBI/DEA).
  * **Redis 7:** C2 real-time state caching and pub/sub.
* **Frontend (C2 Dashboard):** Next.js (React + TypeScript), TailwindCSS, Deck.gl + MapLibre GL for 2D/3D tactical visualization.

---

## 3. Monorepo Directory Architecture (`frontier-c4isr`)
Strictly adhere to this directory tree:

```text
frontier-c4isr/
├── ARCHITECTURE.md                 # System of Systems Architecture (SSOT)
├── README.md                       # Presentation & Quickstart Guide
├── docker-compose.yml              # PostGIS, Redpanda (Kafka), Qdrant, Redis
├── .env.example
├── pyproject.toml
├── shared/                         # Shared core package across all subsystems
│   ├── events/                     # Pydantic v2 schemas for Kafka events (ThreatAlert, JurisdictionHandoff)
│   ├── geo/                        # PostGIS utilities and 3-Ring Geofencing (Ring 1, 2, 3)
│   └── config/                     # Base configuration (Pydantic Settings)
├── services/                       # The 5 Core Subsystems (FastAPI microservices + Workers)
│   ├── 01-maritime-coastline/      # USCG & Navy: AIS ingestion (MarineCadastre) + Bi-GRU Anomaly Detection
│   ├── 02-airspace-shield/         # USAF & FAA: OpenSky ADS-B ingestion + Flight Trajectory Autoencoder
│   ├── 03-narcotics-intel/         # DEA & CBP: CBP/NFLIS/HIDTA data + Spatio-Temporal GNN
│   ├── 04-criminal-interstate/     # FBI & USDOT: FBI Wanted API + Traffic Cams (ALPR + ArcFace in Qdrant)
│   ├── 05-geospatial-recon/        # US Army & NGA: USGS/Sentinel Satellite + TIGER/Line Shapefiles
│   └── c2-gateway/                 # API Gateway + WebSocket Server for real-time streaming to Dashboard
├── ml-training/                    # Datasets, models, TPU Colab training notebook
│   ├── datasets/                   # OpenSky client, FBI client, synthetic telemetry generators
│   ├── models/                     # Flight Autoencoder, Maritime Bi-GRU, Qdrant Face Matcher
│   ├── frontier_c4isr_tpu_training.ipynb  # Interactive Google Colab TPU Notebook
│   └── train_tpu_colab.py          # Multi-hardware training script (TPU / CUDA / MPS / CPU)
├── infra/
│   ├── postgres/init-postgis.sql   # Spatial tables and 3-Ring Geofence initialization
│   └── scripts/                    # US Census TIGER Shapefile download automation
└── dashboard-c2/                   # Next.js + Deck.gl Command & Control Dashboard
```

---

## 4. Subsystems Specification & Public Feeds

### Subsystem 01: `01-maritime-coastline` (USCG & US Navy)
* **Data Sources:** MarineCadastre.gov (Vessel AIS) and NOAA NDBC (Oceanic buoys).
* **Kafka Topics:** Consumes `raw.ais.positions` | Emits `alerts.maritime` and `events.jurisdiction.handoff`.
* **DL Model:** Bi-GRU / LSTM for trajectory anomaly detection (identifying AIS dark ship shutdowns and ship-to-ship offload meetings).

### Subsystem 02: `02-airspace-shield` (USAF & FAA)
* **Data Sources:** OpenSky Network REST API (`https://opensky-network.org/api/states/all`) and FAA TFRs.
* **Kafka Topics:** Consumes `raw.adsb.states` | Emits `alerts.airspace`.
* **DL Model:** Deep Autoencoder for clandestine flight profile detection (low altitude + reduced velocity near federal border).

### Subsystem 03: `03-narcotics-intel` (DEA & CBP)
* **Data Sources:** CBP Drug Seizure Statistics (CSV), DEA NFLIS, and HIDTA strategic zones.
* **Kafka Topics:** Emits `intel.narcotics.hotspots`.
* **DL Model:** Spatio-Temporal Graph Neural Network (ST-GNN) predicting illicit transit probability per Port of Entry (POE) and interstate highway corridor (I-10, I-35, I-95).

### Subsystem 04: `04-criminal-interstate` (FBI & USDOT)
* **Data Sources:**
  * FBI Wanted API (`https://api.fbi.gov/wanted/v1/list`) — Fugitives, biometric photos, and metadata.
  * State 511 highway traffic cameras & USDOT transport monitors.
* **Kafka Topics:** Emits `alerts.criminal.sighting` | Consumes `events.jurisdiction.handoff`.
* **DL Models:**
  * **Vision:** ArcFace 512-dim face embeddings indexed in **Qdrant** + YOLOv8 ALPR on highway corridors.
  * **NLP:** Named Entity Recognition (NER) on fugitive descriptions.

### Subsystem 05: `05-geospatial-recon` (US Army & NGA)
* **Data Sources:** US Census TIGER/Line Shapefiles (federal boundaries, 50 states, and primary interstates) and USGS / Sentinel-2 imagery.
* **Core Responsibilities:** Seed official boundaries in PostGIS and run object detection (YOLOv8 trained on xView/DOTA/RarePlanes) over satellite imagery of borderlands.

---

## 5. Event Bus Standard Contracts (Pydantic / Kafka JSON)

All microservices emit events following these standard contracts in `shared/events/schemas.py`:

```python
from datetime import datetime
from enum import Enum
from typing import Any, Optional
from uuid import UUID, uuid4
from pydantic import BaseModel, Field

class SecurityRing(str, Enum):
    RING_1_MARITIME = "RING_1_MARITIME"
    RING_2_FEDERAL = "RING_2_FEDERAL"
    RING_3_INTERSTATE = "RING_3_INTERSTATE"

class Agency(str, Enum):
    USCG = "USCG"
    US_NAVY = "US_NAVY"
    USAF = "USAF"
    US_ARMY = "US_ARMY"
    CBP = "CBP"
    DEA = "DEA"
    FBI = "FBI"
    USDOT = "USDOT"
    STATE_TROOPERS = "STATE_TROOPERS"

class ThreatAlertEvent(BaseModel):
    event_id: UUID = Field(default_factory=uuid4)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    subsystem: str
    ring: SecurityRing
    lead_agency: Agency
    severity: float = Field(..., ge=0.0, le=1.0, description="Risk score computed by Deep Learning model")
    latitude: float
    longitude: float
    target_id: str
    threat_type: str
    metadata: dict[str, Any] = Field(default_factory=dict)

class JurisdictionHandoffEvent(BaseModel):
    handoff_id: UUID = Field(default_factory=uuid4)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    target_id: str
    from_ring: SecurityRing
    to_ring: SecurityRing
    from_agency: Agency
    to_agency: Agency
    last_known_lat: float
    last_known_lon: float
    reason: str
```

---

## 6. Phased Execution Roadmap
* **Phase 1 (Infra & Core):** Directory scaffolding, `shared/` package, `docker-compose.yml` (PostGIS, Redpanda/Kafka, Qdrant, Redis), and PostGIS 3-Ring initialization script with spatial indexes.
* **Phase 2 (Datasets & Deep Learning):** Real public API clients (FBI Wanted + OpenSky Network), Flight Autoencoder, Maritime Bi-GRU, Qdrant facial vector search, and Google Colab TPU distributed training.
* **Phase 3 (Geofencing & Handoff Engine):** Real-time spatial engine detecting border crossings and emitting `JurisdictionHandoffEvent`.
* **Phase 4 (Deep Learning Perception & C2 Dashboard):** Full YOLOv8 integration and Next.js + Deck.gl tactical dashboard.
