"""
Project Frontier - Subsystem 03 (Narcotics Intelligence)
Ingests CBP Seizure Portal statistics and maps High Intensity Drug Trafficking Areas (HIDTA)
across US-Mexico border Ports of Entry (POEs) and Interstate Corridors (I-10, I-35, I-95).
"""

from typing import Any, Dict, List
from pydantic import BaseModel


class PortOfEntry(BaseModel):
    id: str
    name: str
    state: str
    latitude: float
    longitude: float
    connected_interstates: List[str]
    historical_risk_weight: float


# Critical Strategic Ports of Entry (Ring 2 -> Ring 3 Gateways)
STRATEGIC_POES: List[PortOfEntry] = [
    PortOfEntry(
        id="POE-SAN-YSIDRO",
        name="San Ysidro (San Diego CA)",
        state="CA",
        latitude=32.5428,
        longitude=-117.0297,
        connected_interstates=["I-5", "I-8"],
        historical_risk_weight=0.92,
    ),
    PortOfEntry(
        id="POE-OTAY-MESA",
        name="Otay Mesa (Commercial Cargo CA)",
        state="CA",
        latitude=32.5511,
        longitude=-116.9366,
        connected_interstates=["I-905", "I-5"],
        historical_risk_weight=0.88,
    ),
    PortOfEntry(
        id="POE-NOGALES",
        name="Nogales Grand Ave (Mariposa AZ)",
        state="AZ",
        latitude=31.3328,
        longitude=-110.9436,
        connected_interstates=["I-19", "I-10"],
        historical_risk_weight=0.85,
    ),
    PortOfEntry(
        id="POE-EL-PASO",
        name="El Paso Bridge of the Americas (TX)",
        state="TX",
        latitude=31.7674,
        longitude=-106.4533,
        connected_interstates=["I-10", "I-25"],
        historical_risk_weight=0.94,
    ),
    PortOfEntry(
        id="POE-LAREDO",
        name="Laredo World Trade Bridge (TX)",
        state="TX",
        latitude=27.5022,
        longitude=-99.5075,
        connected_interstates=["I-35"],
        historical_risk_weight=0.96,
    ),
    PortOfEntry(
        id="POE-HIDALGO",
        name="Hidalgo / Pharr International (TX)",
        state="TX",
        latitude=26.0967,
        longitude=-98.2439,
        connected_interstates=["I-69C", "I-37"],
        historical_risk_weight=0.89,
    ),
    PortOfEntry(
        id="POE-BROWNSVILLE",
        name="Brownsville Veterans / Los Tomates (TX)",
        state="TX",
        latitude=25.8856,
        longitude=-97.4764,
        connected_interstates=["I-69E", "I-37"],
        historical_risk_weight=0.82,
    ),
]

# HIDTA Critical Interstate Hubs (Ring 3 Internal Interception Nodes)
INTERSTATE_HUBS: List[Dict[str, Any]] = [
    {"id": "HUB-SAN-ANTONIO", "name": "San Antonio TX Hub", "corridors": ["I-10", "I-35"], "latitude": 29.4241, "longitude": -98.4936},
    {"id": "HUB-HOUSTON", "name": "Houston TX Gulf Hub", "corridors": ["I-10", "I-45"], "latitude": 29.7604, "longitude": -95.3698},
    {"id": "HUB-DALLAS", "name": "Dallas/Fort Worth Metroplex", "corridors": ["I-35", "I-20"], "latitude": 32.7767, "longitude": -96.7970},
    {"id": "HUB-PHOENIX", "name": "Phoenix AZ Central Hub", "corridors": ["I-10", "I-17"], "latitude": 33.4484, "longitude": -112.0740},
    {"id": "HUB-ATLANTA", "name": "Atlanta GA Southeastern Hub", "corridors": ["I-85", "I-75", "I-20"], "latitude": 33.7490, "longitude": -84.3880},
    {"id": "HUB-JACKSONVILLE", "name": "Jacksonville FL Atlantic Hub", "corridors": ["I-10", "I-95"], "latitude": 30.3322, "longitude": -81.6557},
]


def build_border_interstate_graph() -> Dict[str, Any]:
    """
    Constructs the directed border-to-interior graph definition.
    Nodes: 7 POEs + 6 Interstate Hubs = 13 Nodes.
    Edges: Connect POEs to internal transit hubs along I-10, I-35, and I-95.
    """
    nodes = []
    for poe in STRATEGIC_POES:
        nodes.append({"id": poe.id, "type": "POE", "lat": poe.latitude, "lon": poe.longitude, "risk": poe.historical_risk_weight})
    for hub in INTERSTATE_HUBS:
        nodes.append({"id": hub["id"], "type": "HUB", "lat": hub["latitude"], "lon": hub["longitude"], "risk": 0.50})

    # Directed routing edges: [src_idx, dst_idx, corridor_weight]
    # Laredo (4) -> San Antonio (7) along I-35
    # San Antonio (7) -> Dallas (9) along I-35
    # El Paso (3) -> San Antonio (7) along I-10
    # San Antonio (7) -> Houston (8) along I-10
    # Houston (8) -> Jacksonville (12) along I-10
    # Nogales (2) -> Phoenix (10) along I-19/I-10
    # San Ysidro (0) -> Phoenix (10) along I-8/I-10
    # Hidalgo (5) -> San Antonio (7) along I-37
    edges = [
        (4, 7, 0.95),  # Laredo -> San Antonio (I-35)
        (7, 9, 0.90),  # San Antonio -> Dallas (I-35)
        (3, 7, 0.85),  # El Paso -> San Antonio (I-10)
        (7, 8, 0.88),  # San Antonio -> Houston (I-10)
        (8, 12, 0.82), # Houston -> Jacksonville (I-10)
        (2, 10, 0.86), # Nogales -> Phoenix (I-10)
        (0, 10, 0.80), # San Ysidro -> Phoenix (I-10)
        (5, 7, 0.84),  # Hidalgo -> San Antonio (I-37)
    ]

    return {"nodes": nodes, "edges": edges, "num_nodes": len(nodes)}

