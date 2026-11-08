# PROJECT FRONTIER (FRONTIER-C4ISR)
### Homeland Defense & Border Protection System of Systems (SoS)

[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![PyTorch 2.x](https://img.shields.io/badge/PyTorch-2.x-EE4C2C.svg?logo=pytorch)](https://pytorch.org/)
[![Google Colab GPU](https://img.shields.io/badge/Google%20Colab-GPU%20Training%20Suite-F9AB00.svg?logo=googlecolab)](https://colab.research.google.com/github/maykonlincolnusa/FRONTIER-OS-Frontier-Operating-System-/blob/main/notebooks/colab/00_FRONTIER_C4ISR_Master_Colab_Training_Suite.ipynb)
[![PostgreSQL 16 + PostGIS](https://img.shields.io/badge/Database-PostgreSQL%2016%20%2B%20PostGIS-336791.svg?logo=postgresql)](https://postgis.net/)
[![Redpanda Kafka](https://img.shields.io/badge/Event%20Bus-Redpanda%20Kafka-ED3A25.svg?logo=apachekafka)](https://redpanda.com/)
[![Qdrant Vector DB](https://img.shields.io/badge/Vector%20DB-Qdrant-DC2626.svg)](https://qdrant.tech/)
[![FastAPI](https://img.shields.io/badge/API-FastAPI-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-green.svg)](LICENSE)

---

## 1. Executive Summary

**Project Frontier** is an enterprise-grade **C4ISR** (*Command, Control, Communications, Computers, Intelligence, Surveillance, and Reconnaissance*) platform engineered for United States territorial integrity and multi-agency border enforcement. 

The architecture unifies live public telemetry, open-source intelligence (OSINT), and Deep Learning perception across federal, maritime, airspace, and interstate jurisdictions (USCG, US Navy, USAF, FAA, US Army, NGA, CBP, DEA, FBI, and USDOT).

---

## 2. Tactical Command & Control (C2) Visualizer

| Hemispheric Operational Theater (Americas Overview) | Continental US & 3 Defense Rings |
| :---: | :---: |
| ![Hemispheric Command](docs/screenshots/c4isr_hemispheric_command.jpg) | ![Continental US 50 States](docs/screenshots/c4isr_us_50_states.jpg) |

| Transnational Supply Corridors (South America to US) |
| :---: |
| ![South America Corridors](docs/screenshots/c4isr_south_america_corridors.jpg) |

---

## 3. The 3 Defense-in-Depth Security Rings

Target tracking and interception operate under a **Defense-in-Depth** doctrine. When an entity (vessel, aircraft, ground vehicle, or individual) crosses from one jurisdictional polygon to another, **PostGIS** detects the boundary breach and emits a `JURISDICTION_HANDOFF` event on the Redpanda message bus:

| Security Ring | Boundary & Geometry | Responsible Agencies | Handoff Trigger |
| :--- | :--- | :--- | :--- |
| **RING 1: MARITIME & BLUE BORDER** *(Outer Perimeter)* | Territorial Sea (12 NM), Contiguous Zone (24 NM), and Exclusive Economic Zone (EEZ, 200 NM) covering Atlantic, Pacific, and Gulf of Mexico approaches. | **USCG & US Navy** | Vessels mooring or beaching outside official designated ports trigger `JURISDICTION_HANDOFF` $\rightarrow$ `RING_2_FEDERAL`. |
| **RING 2: FEDERAL LAND & AIR BORDER** *(Main Perimeter)* | US-Mexico Southern Border (100-mile statutory zone), US-Canada Northern Border, Sovereign Airspace, and official Ports of Entry (POEs). | **CBP, US Army, USAF, FAA, NGA** | Ground targets breaching federal checkpoints into domestic highway networks trigger `JURISDICTION_HANDOFF` $\rightarrow$ `RING_3_INTERSTATE`. |
| **RING 3: INTERSTATE & INTERNAL CORRIDORS** *(Inner Perimeter)* | State boundaries across all 50 states and strategic interstate transit corridors (I-10, I-35, I-95). | **FBI, DEA, USDOT, State Troopers** | Cross-state fugitive sightings and narcotics transport corridors trigger inter-state tactical alerts. |

---

## 4. Microservices Mesh Architecture (Ports 8000–8006)

Each domain capability runs as an isolated microservice supervised by `scripts/start_microservices_mesh.py`. Computationally intensive AI tasks run within an isolated `InferenceProcessPool` utilizing `multiprocessing.Lock` to guarantee safe thread execution with PyTorch and ONNX Runtime:

| Port | Service ID | Service Name | Responsible Agencies | Deep Learning Model / Engine |
| :--- | :--- | :--- | :--- | :--- |
| `:8000` | `00-c2-gateway` | C2 API Gateway & WebSocket Mesh | JTF C4ISR | Cross-Ring Fusion Engine & PostGIS Advisory Locks |
| `:8001` | `01-maritime-coastline` | Maritime & Blue Border Shield | USCG & US Navy | `maritime_lstm.onnx` (`TrajectoryAnomalyLSTM`) |
| `:8002` | `02-airspace-shield` | Airspace & Radar Shield | USAF, CBP AMO & FAA | `airspace_ae.onnx` (`FlightStateAutoencoder`) |
| `:8003` | `03-narcotics-intel` | Narcotics ST-GNN Intelligence | DEA, CBP & HIDTA | `narcotics_stgnn.onnx` (`SpatioTemporalGNN`) |
| `:8004` | `04-criminal-interstate` | Interstate Biometrics & ALPR | FBI, DEA & State Police | `ArcFace-512` + `YOLOv8-ALPR` (Qdrant Vector DB) |
| `:8005` | `05-geospatial-recon` | Orbital & Drone Recon | US Army, NGA & CBP | `frontier_sat_yolov8.onnx` (Sentinel-2 / xView) |
| `:8006` | `06-c2-copilot` | Multi-Agent Tactical Copilot | Joint Command Staff | Multi-Agent RAG + Text-to-PostGIS + GraphRAG |

---

## 5. Google Colab GPU Training Suite (`notebooks/colab/`)

Interactive, production-ready notebooks configured for NVIDIA GPUs (T4 / L4 / A100) with PyTorch Mixed Precision (`torch.amp.autocast('cuda')`), loss curves, dynamic-axes ONNX export, and automated weights packaging:

| Notebook | Focus | Models & Outputs | Colab Link |
| :--- | :--- | :--- | :---: |
| **00. Master C4ISR GPU Training Suite** | Full End-to-End Pipeline & Real US Gov Datasets | All 4 ONNX models packaged into `frontier_c4isr_onnx_weights.zip` | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/maykonlincolnusa/FRONTIER-OS-Frontier-Operating-System-/blob/main/notebooks/colab/00_FRONTIER_C4ISR_Master_Colab_Training_Suite.ipynb) |
| **01. Maritime AIS LSTM** | MarineCadastre AIS Trajectory Autoencoder | `maritime_lstm.onnx` (Dark Ships & Submersibles) | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/maykonlincolnusa/FRONTIER-OS-Frontier-Operating-System-/blob/main/notebooks/colab/01_Maritime_AIS_LSTM_Colab_GPU.ipynb) |
| **02. Airspace ADS-B Autoencoder** | OpenSky Low-Altitude Flight Vector Reconstructor | `airspace_ae.onnx` (Clandestine Radar Evasion) | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/maykonlincolnusa/FRONTIER-OS-Frontier-Operating-System-/blob/main/notebooks/colab/02_Airspace_ADSB_Autoencoder_Colab_GPU.ipynb) |
| **03. Narcotics Spatio-Temporal GNN** | CBP POE Seizures & HIDTA Interstates (I-10, I-35, I-95) | `narcotics_stgnn.onnx` (Corridor 24h Risk Forecast) | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/maykonlincolnusa/FRONTIER-OS-Frontier-Operating-System-/blob/main/notebooks/colab/03_Narcotics_STGNN_Corridors_Colab_GPU.ipynb) |
| **04. Satellite YOLOv8 & FBI Biometrics** | Sentinel-2 / xView Satellite Tile & ArcFace Embeddings | `frontier_sat_yolov8.onnx` + Qdrant 512-d Search | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/maykonlincolnusa/FRONTIER-OS-Frontier-Operating-System-/blob/main/notebooks/colab/04_Satellite_YOLOv8_xView_Recon_Colab_GPU.ipynb) |

---

## 6. Monorepo Directory Architecture

```text
frontier-c4isr/
├── ARCHITECTURE.md                 # System Architecture & Single Source of Truth
├── README.md                       # Executive Overview & Deployment Guide
├── docker-compose.yml              # PostGIS, Redpanda (Kafka), Qdrant, Redis
├── .env.example                    # Environment Configuration Template
├── pyproject.toml                  # Python 3.12+ project definition & dependencies
├── shared/                         # Shared Core Library across all microservices
│   ├── concurrency/                # InferenceProcessPool (spawn + Locks) & Distributed Lock
│   ├── events/                     # Pydantic v2 event contracts (Kafka schemas)
│   ├── geo/                        # PostGIS utilities, Haversine, and 3-Ring Geofencing
│   └── config/                     # Pydantic Settings (Postgres, Kafka, Qdrant, Redis)
├── services/                       # Autonomous Microservices & Workers
│   ├── 01-maritime-coastline/      # USCG & Navy (AIS Ingestion + Bi-GRU / LSTM Anomaly)
│   ├── 02-airspace-shield/         # USAF & FAA (OpenSky ADS-B + Flight Autoencoder)
│   ├── 03-narcotics-intel/         # DEA & CBP (Seizure hot-spots + ST-GNN)
│   ├── 04-criminal-interstate/     # FBI & USDOT (FBI Wanted API + Qdrant Face Match)
│   ├── 05-geospatial-recon/        # US Army & NGA (TIGER Shapefiles + Satellite Recon)
│   ├── c2-gateway/                 # C2 Gateway & Real-time WebSocket Server
│   └── c2-copilot/                 # Multi-Agent Tactical Copilot (SSE Streaming)
├── notebooks/colab/                # Production Google Colab GPU Training Notebooks (.ipynb)
├── ml-training/                    # Deep Learning datasets, models, and training scripts
├── infra/                          # PostGIS schemas, OKE Kubernetes manifests, OCI scripts
├── dashboard-c2/                   # Next.js 14 Tactical Command & Control Interface
└── tests/                          # Automated Pytest suite
```

---

## 7. Quickstart Guide

### Step 1: Start Core Infrastructure Containers
```bash
docker compose up -d
```
Verifies and launches:
* **PostgreSQL 16 + PostGIS 3.4** on port `5432`.
* **Redpanda (Kafka)** on ports `9092` (Kafka API) and `8080` (Console UI).
* **Qdrant Vector DB** on ports `6333` (HTTP) and `6334` (gRPC).
* **Redis 7** on port `6379`.

### Step 2: Launch the 7 Microservices Mesh
```bash
# Starts C2 Gateway (8000) and Subsystems 01-06 (8001-8006)
uv run python scripts/start_microservices_mesh.py
```

### Step 3: Launch the C4ISR Command Center UI
```bash
npm run dev --prefix dashboard-c2
```
Access the tactical interface at **`http://localhost:3000`**.

---

## 8. Automated Test Suite
```bash
uv run pytest -q --tb=short
```
*All 25 unit and integration tests passing.*
