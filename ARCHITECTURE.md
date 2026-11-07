# PROJECT FRONTIER (FRONTIER-C4ISR) - System of Systems Architecture

> **AI AGENT DIRECTIVE (Google Antigravity / Gemini CLI):**
> This file is the Single Source of Truth (SSOT) for Project Frontier. Before creating or modifying any microservice, database schema, or AI pipeline, strictly follow the directory layout, technology stack, event contracts, and jurisdictional rules defined below.

---

## 1. Visão Geral do Sistema (System of Systems - SoS)
**Project Frontier** é uma plataforma unificada C4ISR (*Command, Control, Communications, Computers, Intelligence, Surveillance, and Reconnaissance*) para proteção de fronteiras dos EUA. O sistema integra dados públicos reais de múltiplas agências (USCG, US Navy, USAF, FAA, US Army, NGA, CBP, DEA, FBI e USDOT) com modelos de *Deep Learning* em tempo real.

### 1.1. Os 3 Anéis de Segurança (Geofencing Hierárquico)
O rastreamento de alvos opera em **Defesa em Profundidade**. Quando uma entidade (embarcação, aeronave, veículo ou indivíduo) cruza o polígono geográfico de um anel para outro no **PostGIS**, o sistema emite o evento `JURISDICTION_HANDOFF` no **Kafka**:

1. **RING 1 - MARITIME & BLUE BORDER (Anel Externo):**
   * **Geometria:** Mar Territorial (12 MN), Zona Contígua (24 MN) e ZEE (200 MN).
   * **Agências:** USCG (Guarda Costeira) & US Navy (Marinha).
   * **Transição:** Alvos marítimos que atracam fora de portos oficiais disparam `JURISDICTION_HANDOFF` -> `RING_2_FEDERAL`.
2. **RING 2 - FEDERAL LAND & AIR BORDER (Anel Principal):**
   * **Geometria:** Fronteiras terrestres (EUA-México / EUA-Canadá), Espaço Aéreo Soberano e Portos de Entrada (POEs).
   * **Agências:** CBP, US Army, USAF, FAA, NGA.
   * **Transição:** Ameaças que furam o bloqueio federal e entram na malha rodoviária disparam `JURISDICTION_HANDOFF` -> `RING_3_INTERSTATE`.
3. **RING 3 - INTERSTATE & INTERNAL CORRIDORS (Anel Interno):**
   * **Geometria:** Divisas entre os 50 estados americanos e corredores de rodovias interestaduais (*Interstates* I-10, I-35, I-95).
   * **Agências:** FBI, DEA, USDOT, State Troopers.

---

## 2. Stack Tecnológica Obrigatória
* **Linguagem Backend & IA:** Python 3.11+ (`uv` ou `poetry` para gerenciamento de pacotes).
* **Framework de APIs:** FastAPI (100% assíncrono), Pydantic v2, SQLAlchemy 2.0 (`asyncpg`) + GeoAlchemy2.
* **Deep Learning & Visão Computacional:** PyTorch, Ultralytics (YOLOv8), ONNX Runtime, HuggingFace Transformers, PyTorch Geometric (GNNs).
* **Mensageria (Event Bus):** Apache Kafka (via `aiokafka`) ou Redpanda (compatível com Kafka, mais leve em Docker).
* **Bancos de Dados:**
  * **PostgreSQL 16 + PostGIS:** Dados relacionais, telemetria espaço-temporal e Geofencing dos 3 Anéis.
  * **Qdrant:** Banco vetorial para reconhecimento facial (ArcFace) e busca semântica de relatórios (FBI/DEA).
  * **Neo4j (Opcional Fase 2):** Grafo de vínculos de cartéis e rotas interestaduais.
* **Frontend (C2 Dashboard):** Next.js (React + TypeScript), TailwindCSS, Deck.gl + MapLibre GL / Mapbox para renderização tática 2D/3D.

---

## 3. Estrutura do Monorepo (`frontier-c4isr`)
Mantenha estritamente esta árvore de diretórios ao gerar arquivos:

```text
frontier-c4isr/
├── ARCHITECTURE.md                 # Este documento (SSOT)
├── docker-compose.yml              # PostGIS, Redpanda (Kafka), Qdrant, Redis
├── .env.example
├── shared/                         # Biblioteca compartilhada entre todos os subsistemas
│   ├── events/                     # Schemas Pydantic para eventos Kafka (ThreatAlert, JurisdictionHandoff)
│   ├── geo/                        # Utilitários PostGIS e verificação de Anéis (Ring 1, 2, 3)
│   └── config/                     # Configurações base (Pydantic Settings)
├── services/                       # Os 5 Subsistemas (Microsserviços FastAPI + Workers)
│   ├── 01-maritime-coastline/      # USCG & Navy: Ingestão AIS (MarineCadastre) + LSTM Anomaly Detection
│   ├── 02-airspace-shield/         # USAF & FAA: Ingestão OpenSky ADS-B + Autoencoder Flight Pattern
│   ├── 03-narcotics-intel/         # DEA & CBP: Dados CBP/NFLIS/HIDTA + Spatio-Temporal GNN
│   ├── 04-criminal-interstate/     # FBI & USDOT: API FBI Wanted + 511 Traffic Cams (YOLOv8/ALPR + ArcFace)
│   ├── 05-geospatial-recon/        # US Army & NGA: Satélite USGS/Sentinel + TIGER/Line Shapefiles
│   └── c2-gateway/                 # API Gateway + WebSocket Server para transmitir alertas em tempo real ao Frontend
├── ml-training/                    # Notebooks e scripts de treino (xView, RarePlanes, DOTA, SeaShips)
├── infra/
│   ├── postgres/init-postgis.sql   # Criação das tabelas espaciais e polígonos de fronteira
│   └── scripts/                    # Scripts de download de Shapefiles (US Census TIGER)
└── dashboard-c2/                   # Aplicação Next.js + Deck.gl (Centro de Comando e Controle)
```

---

## 4. Especificação dos 5 Subsistemas e Fontes Públicas

### Subsistema 01: `01-maritime-coastline` (USCG & US Navy)
* **Fontes de Dados:** MarineCadastre.gov (AIS de navios) e NOAA NDBC (boias oceânicas).
* **Tópicos Kafka:** Consome `raw.ais.positions` | Publica `alerts.maritime` e `events.jurisdiction.handoff`.
* **Modelo DL:** LSTM / Transformer para detecção de anomalias de trajetória (identificar desligamento de AIS "dark ships" e encontros em alto-mar *ship-to-ship*).

### Subsistema 02: `02-airspace-shield` (USAF & FAA)
* **Fontes de Dados:** OpenSky Network REST API (`https://opensky-network.org/api/states/all`) e FAA TFRs.
* **Tópicos Kafka:** Consome `raw.adsb.states` | Publica `alerts.airspace`.
* **Modelo DL:** Autoencoder para detecção de perfil de voo clandestino (baixa altitude + velocidade reduzida próximo à fronteira federal).

### Subsistema 03: `03-narcotics-intel` (DEA & CBP)
* **Fontes de Dados:** CBP Drug Seizure Statistics (CSV), DEA NFLIS e zonas HIDTA.
* **Tópicos Kafka:** Publica `intel.narcotics.hotspots`.
* **Modelo DL:** Spatio-Temporal Graph Neural Network (ST-GNN) prevendo probabilidade de tráfego ilícito por Porto de Entrada (POE) e corredor rodoviário (I-10, I-35, I-95).

### Subsistema 04: `04-criminal-interstate` (FBI & USDOT)
* **Fontes de Dados:**
  * FBI Wanted API (`https://api.fbi.gov/wanted/v1/list`) — Ingestão de fugitivos, fotos e metadados.
  * FBI Crime Data Explorer API & Câmeras públicas rodoviárias (State 511 / USDOT).
* **Tópicos Kafka:** Publica `alerts.criminal.sighting` e consome `events.jurisdiction.handoff`.
* **Modelo DL:**
  * **Visão:** YOLOv8 + OCR (ALPR para veículos/placas em divisas estaduais) + embeddings faciais no **Qdrant** comparando com fotos da API do FBI Wanted.
  * **NLP:** Extração de entidades (NER) das descrições dos procurados do FBI.

### Subsistema 05: `05-geospatial-recon` (US Army & NGA)
* **Fontes de Dados:** US Census TIGER/Line Shapefiles (fronteiras federais, 50 estados e Interstates) e imagens USGS/Sentinel-2.
* **Responsabilidade Core:** Carregar os polígonos oficiais no PostGIS e rodar detecção de objetos (YOLOv8 treinado em xView/DOTA/RarePlanes) em imagens de satélite das zonas de fronteira terrestre.

---

## 5. Contrato Padrão de Eventos (Pydantic / Kafka JSON Schema)

Todos os subsistemas devem emitir eventos seguindo este contrato em `shared/events/schemas.py`:

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

class ThreatAlertEvent(BaseModel):
    event_id: UUID = Field(default_factory=uuid4)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    subsystem: str
    ring: SecurityRing
    lead_agency: Agency
    severity: float = Field(..., ge=0.0, le=1.0, description="Score de risco calculado pelo modelo de Deep Learning")
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

## 6. Plano de Execução Faseado (Roadmap para o Agente)
* **Fase 1 (Infra & Core):** Criar a estrutura de pastas, o pacote `shared/`, o `docker-compose.yml` (PostGIS, Redpanda/Kafka, Qdrant) e o script de inicialização do PostGIS com as tabelas de Geofencing dos 3 Anéis.
* **Fase 2 (Primeiro Pipeline Real - FBI + Airspace):** Implementar o `04-criminal-interstate` consumindo a API real do **FBI Wanted** (salvando no Postgres + Qdrant) e o `02-airspace-shield` consumindo a API real do **OpenSky Network** na fronteira sul (EUA-México).
* **Fase 3 (Geofencing & Handoff):** Implementar o motor espacial no PostGIS que detecta cruzamento de fronteira e emite `JurisdictionHandoffEvent`.
* **Fase 4 (Deep Learning & C2 Dashboard):** Integrar modelos PyTorch/YOLOv8 e subir o painel tático em Next.js + Deck.gl.
