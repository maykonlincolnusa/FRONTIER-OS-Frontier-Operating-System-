"""
Project Frontier - Pan-American Latin American OSINT & Telemetry Connector
Federated ingestion of multi-modal criminal logistics across:
Brazil, Colombia, Panama, Mexico, Chile, Argentina, and the United States.
"""

from typing import Any, Dict, List, Optional
import random
import time

from shared.events.schemas import (
    Agency,
    InternationalCorridorHandoffEvent,
    TheaterOfOperations,
    TransnationalSyndicate,
    TransportModal,
)

# Authoritative Strategic Nodes across 7 Pan-American Theaters
PANAMERICAN_NODES: List[Dict[str, Any]] = [
    # BRAZIL (PCC & CV corridors)
    {
        "id": "BR-PORT-SANTOS",
        "name": "Porto de Santos (SP)",
        "theater": TheaterOfOperations.BRAZIL,
        "lat": -23.967,
        "lon": -46.301,
        "type": "SEAPORT",
        "modal": TransportModal.MARITIME_CONTAINER,
        "primary_syndicate": TransnationalSyndicate.PCC,
        "agency": Agency.PF_BR,
        "base_risk": 0.88,
        "description": "Primary transatlantic container export hub for cocaine hidden in legal cargo (reefers, machinery).",
    },
    {
        "id": "BR-PORT-PARANAGUA",
        "name": "Porto de Paranaguá (PR)",
        "theater": TheaterOfOperations.BRAZIL,
        "lat": -25.501,
        "lon": -48.508,
        "type": "SEAPORT",
        "modal": TransportModal.MARITIME_CONTAINER,
        "primary_syndicate": TransnationalSyndicate.PCC,
        "agency": Agency.ANTAQ_BR,
        "base_risk": 0.79,
        "description": "Secondary Atlantic bulk and container terminal connected directly to the BR-277 highway from Paraguay.",
    },
    {
        "id": "BR-HIGHWAY-BR277-FOZ",
        "name": "Corredor BR-277 (Foz do Iguaçu - Ponte da Amizade)",
        "theater": TheaterOfOperations.BRAZIL,
        "lat": -25.513,
        "lon": -54.587,
        "type": "HIGHWAY_JUNCTURE",
        "modal": TransportModal.HIGHWAY_FREIGHT,
        "primary_syndicate": TransnationalSyndicate.PCC,
        "agency": Agency.PRF_BR,
        "base_risk": 0.94,
        "description": "Tri-border gateway (Brazil-Paraguay-Argentina) feeding firearms, contraband, and cocaine paste.",
    },
    {
        "id": "BR-HIGHWAY-BR163-MT",
        "name": "Corredor BR-163 (Mato Grosso - Rota Caipira)",
        "theater": TheaterOfOperations.BRAZIL,
        "lat": -12.548,
        "lon": -55.722,
        "type": "HIGHWAY_JUNCTURE",
        "modal": TransportModal.HIGHWAY_FREIGHT,
        "primary_syndicate": TransnationalSyndicate.PCC,
        "agency": Agency.PRF_BR,
        "base_risk": 0.82,
        "description": "Grain freight axis used to blend synthetic precursor shipments and Bolivian base paste.",
    },
    {
        "id": "BR-AMAZON-TABATINGA",
        "name": "Calha do Rio Solimões (Tabatinga / Tríplice Fronteira)",
        "theater": TheaterOfOperations.BRAZIL,
        "lat": -4.241,
        "lon": -69.938,
        "type": "RIVERINE_HUB",
        "modal": TransportModal.RIVERINE_BARGE,
        "primary_syndicate": TransnationalSyndicate.CV,
        "agency": Agency.MARINHA_BR,
        "base_risk": 0.91,
        "description": "Riverine narcotics corridor dominated by Comando Vermelho connecting Peruvian labs to Manaus.",
    },

    # COLOMBIA (Clan del Golfo & Pacific/Caribbean exits)
    {
        "id": "CO-PACIFIC-TUMACO",
        "name": "Puerto de Tumaco (Nariño)",
        "theater": TheaterOfOperations.COLOMBIA,
        "lat": 1.798,
        "lon": -78.815,
        "type": "LITTORAL_BASE",
        "modal": TransportModal.SEMI_SUBMERSIBLE,
        "primary_syndicate": TransnationalSyndicate.CLAN_DEL_GOLFO,
        "agency": Agency.ARMADA_CO,
        "base_risk": 0.96,
        "description": "Primary launch sanctuary for Low Profile Vessels (LPVs) and fully submersible narco-submarines.",
    },
    {
        "id": "CO-PORT-BUENAVENTURA",
        "name": "Puerto de Buenaventura (Valle del Cauca)",
        "theater": TheaterOfOperations.COLOMBIA,
        "lat": 3.882,
        "lon": -77.031,
        "type": "SEAPORT",
        "modal": TransportModal.MARITIME_CONTAINER,
        "primary_syndicate": TransnationalSyndicate.CLAN_DEL_GOLFO,
        "agency": Agency.ARMADA_CO,
        "base_risk": 0.89,
        "description": "Major Pacific container terminal with high incidence of rip-on/rip-off container tampering.",
    },
    {
        "id": "CO-CARIBBEAN-URABA",
        "name": "Golfo de Urabá (Turbo / Necoclí)",
        "theater": TheaterOfOperations.COLOMBIA,
        "lat": 8.093,
        "lon": -76.728,
        "type": "LITTORAL_BASE",
        "modal": TransportModal.SEMI_SUBMERSIBLE,
        "primary_syndicate": TransnationalSyndicate.CLAN_DEL_GOLFO,
        "agency": Agency.ARMADA_CO,
        "base_risk": 0.93,
        "description": "Chokepoint for Darién Gap migrant trafficking and go-fast boats heading toward Panama.",
    },

    # PANAMA (Canal Bottleneck & Darién)
    {
        "id": "PA-CANAL-BALBOA",
        "name": "Canal de Panamá - Terminal Balboa (Pacífico)",
        "theater": TheaterOfOperations.PANAMA,
        "lat": 8.956,
        "lon": -79.567,
        "type": "CANAL_CHOKEPOINT",
        "modal": TransportModal.PANAMA_CANAL_TRANSIT,
        "primary_syndicate": TransnationalSyndicate.UNKNOWN,
        "agency": Agency.ACP_PA,
        "base_risk": 0.85,
        "description": "Pacific entry to the Panama Canal; high-volume container transshipment hub.",
    },
    {
        "id": "PA-CANAL-COLON",
        "name": "Canal de Panamá - Terminal Colón (Caribe / Zona Libre)",
        "theater": TheaterOfOperations.PANAMA,
        "lat": 9.359,
        "lon": -79.901,
        "type": "CANAL_CHOKEPOINT",
        "modal": TransportModal.PANAMA_CANAL_TRANSIT,
        "primary_syndicate": TransnationalSyndicate.UNKNOWN,
        "agency": Agency.ACP_PA,
        "base_risk": 0.87,
        "description": "Atlantic exit and Free Trade Zone exploited for Trade-Based Money Laundering (TBML).",
    },

    # CONE SUR: ARGENTINA & CHILE
    {
        "id": "AR-WATERWAY-ROSARIO",
        "name": "Hidrovía Paraná-Paraguay (Porto de Rosário)",
        "theater": TheaterOfOperations.ARGENTINA,
        "lat": -32.946,
        "lon": -60.639,
        "type": "RIVERINE_HUB",
        "modal": TransportModal.RIVERINE_BARGE,
        "primary_syndicate": TransnationalSyndicate.PCC,
        "agency": Agency.PREFECTURA_AR,
        "base_risk": 0.81,
        "description": "River barge transshipment channel from Paraguay/Bolivia to deepwater European/US export.",
    },
    {
        "id": "CL-PORT-SAN-ANTONIO",
        "name": "Puerto de San Antonio (Valparaíso Region)",
        "theater": TheaterOfOperations.CHILE,
        "lat": -33.587,
        "lon": -71.616,
        "type": "SEAPORT",
        "modal": TransportModal.MARITIME_CONTAINER,
        "primary_syndicate": TransnationalSyndicate.TREN_DE_ARAGUA,
        "agency": Agency.DIRECTEMAR_CL,
        "base_risk": 0.74,
        "description": "Southern Pacific container gateway exploited for transpacific maritime flows.",
    },

    # MEXICO (Sinaloa & CJNG Gateways)
    {
        "id": "MX-PORT-MANZANILLO",
        "name": "Puerto de Manzanillo (Colima)",
        "theater": TheaterOfOperations.MEXICO,
        "lat": 19.053,
        "lon": -104.316,
        "type": "SEAPORT",
        "modal": TransportModal.MARITIME_CONTAINER,
        "primary_syndicate": TransnationalSyndicate.CJNG,
        "agency": Agency.INTERPOL,
        "base_risk": 0.95,
        "description": "Largest Pacific container hub in Mexico; primary arrival point for chemical precursors.",
    },
    {
        "id": "MX-BORDER-NUEVO-LAREDO",
        "name": "Puente del Comercio Mundial (Nuevo Laredo)",
        "theater": TheaterOfOperations.MEXICO,
        "lat": 27.502,
        "lon": -99.508,
        "type": "BORDER_CROSSING",
        "modal": TransportModal.HIGHWAY_FREIGHT,
        "primary_syndicate": TransnationalSyndicate.SINALOA_CARTEL,
        "agency": Agency.CBP,
        "base_risk": 0.97,
        "description": "Highest commercial truck volume crossing on the US-Mexico border connecting into I-35.",
    },

    # UNITED STATES (Ring 1, Ring 2 & Ring 3 Entry Points)
    {
        "id": "US-POE-LAREDO",
        "name": "World Trade Bridge (Laredo, TX)",
        "theater": TheaterOfOperations.USA,
        "lat": 27.599,
        "lon": -99.531,
        "type": "PORT_OF_ENTRY",
        "modal": TransportModal.HIGHWAY_FREIGHT,
        "primary_syndicate": TransnationalSyndicate.SINALOA_CARTEL,
        "agency": Agency.CBP,
        "base_risk": 0.96,
        "description": "Mainland US entryway feeding directly into Ring 3 Interstate I-35 corridor.",
    },
    {
        "id": "US-PORT-HOUSTON",
        "name": "Port of Houston (Barbours Cut / Bayport, TX)",
        "theater": TheaterOfOperations.USA,
        "lat": 29.683,
        "lon": -95.011,
        "type": "SEAPORT",
        "modal": TransportModal.MARITIME_CONTAINER,
        "primary_syndicate": TransnationalSyndicate.PCC,
        "agency": Agency.USCG,
        "base_risk": 0.86,
        "description": "Primary Gulf Coast destination for containerized cargo originating in Santos/Paranaguá.",
    },
    {
        "id": "US-INTERSTATE-I10-SATX",
        "name": "San Antonio Interstate Hub (I-10 / I-35 Junction, TX)",
        "theater": TheaterOfOperations.USA,
        "lat": 29.424,
        "lon": -98.493,
        "type": "HIGHWAY_JUNCTURE",
        "modal": TransportModal.HIGHWAY_FREIGHT,
        "primary_syndicate": TransnationalSyndicate.SINALOA_CARTEL,
        "agency": Agency.DEA,
        "base_risk": 0.95,
        "description": "Strategic Ring 3 inland distribution and interdiction bottleneck for interstate trafficking.",
    },
    {
        "id": "US-PORT-MIAMI",
        "name": "PortMiami & Biscayne Bay (FL)",
        "theater": TheaterOfOperations.USA,
        "lat": 25.778,
        "lon": -80.179,
        "type": "SEAPORT",
        "modal": TransportModal.MARITIME_CONTAINER,
        "primary_syndicate": TransnationalSyndicate.UNKNOWN,
        "agency": Agency.CBP,
        "base_risk": 0.88,
        "description": "Primary Atlantic and Caribbean maritime entry gateway into Florida.",
    },
]

# Multimodal Corridors linking Pan-American Theaters
PANAMERICAN_CORRIDORS: List[Dict[str, Any]] = [
    {
        "corridor_id": "CORRIDOR-PCC-ATLANTIC",
        "name": "Rota Atlântica PCC (Santos/Paranaguá ➔ Houston / Flórida)",
        "origin": "BR-PORT-SANTOS",
        "transshipment": "PA-CANAL-COLON",
        "destination": "US-PORT-HOUSTON",
        "primary_modal": TransportModal.MARITIME_CONTAINER,
        "syndicate": TransnationalSyndicate.PCC,
        "risk_level": 0.88,
        "path": [[-23.967, -46.301], [-5.0, -34.5], [9.359, -79.901], [25.7, -80.2], [29.683, -95.011]],
    },
    {
        "corridor_id": "CORRIDOR-PACIFIC-SUB",
        "name": "Rota Submersível Pacífico (Tumaco ➔ Galápagos ➔ Manzanillo ➔ San Diego)",
        "origin": "CO-PACIFIC-TUMACO",
        "transshipment": "MX-PORT-MANZANILLO",
        "destination": "US-POE-LAREDO",
        "primary_modal": TransportModal.SEMI_SUBMERSIBLE,
        "syndicate": TransnationalSyndicate.CLAN_DEL_GOLFO,
        "risk_level": 0.94,
        "path": [[1.798, -78.815], [-0.95, -90.96], [8.5, -84.5], [19.053, -104.316], [32.53, -117.12]],
    },
    {
        "corridor_id": "CORRIDOR-CV-AMAZON-AIR",
        "name": "Rota Solimões / Aérea Clandestina (Tabatinga ➔ Honduras ➔ Laredo)",
        "origin": "BR-AMAZON-TABATINGA",
        "transshipment": "CO-CARIBBEAN-URABA",
        "destination": "US-POE-LAREDO",
        "primary_modal": TransportModal.CLANDESTINE_AIRCRAFT,
        "syndicate": TransnationalSyndicate.CV,
        "risk_level": 0.91,
        "path": [[-4.241, -69.938], [7.1, -67.5], [15.5, -85.5], [25.6, -100.3], [27.599, -99.531]],
    },
    {
        "corridor_id": "CORRIDOR-CONE-SUR-HIDROVIA",
        "name": "Hidrovía Paraná-Paraguay ➔ Atlântico Sul (Rosário ➔ Santos ➔ Atlântico)",
        "origin": "AR-WATERWAY-ROSARIO",
        "transshipment": "BR-PORT-PARANAGUA",
        "destination": "US-PORT-HOUSTON",
        "primary_modal": TransportModal.RIVERINE_BARGE,
        "syndicate": TransnationalSyndicate.PCC,
        "risk_level": 0.83,
        "path": [[-32.946, -60.639], [-25.513, -54.587], [-25.501, -48.508], [-23.967, -46.301]],
    },
]


class LatamOSINTConnector:
    """
    Federated OSINT & Telemetry Connector for Latin American Operations.
    Integrates with PRF, ANTAQ, Armada de Colombia, ACP Panama, and Directemar.
    """

    _instance: Optional["LatamOSINTConnector"] = None

    def __init__(self):
        self.nodes = PANAMERICAN_NODES
        self.corridors = PANAMERICAN_CORRIDORS

    @classmethod
    def get_instance(cls) -> "LatamOSINTConnector":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def get_nodes_by_theater(self, theater: TheaterOfOperations) -> List[Dict[str, Any]]:
        """Filter nodes by National Theater."""
        return [n for n in self.nodes if n["theater"] == theater]

    def get_corridors_by_syndicate(self, syndicate: TransnationalSyndicate) -> List[Dict[str, Any]]:
        """Filter strategic multimodal routes by syndicate."""
        return [c for c in self.corridors if c["syndicate"] == syndicate]

    def generate_international_handoff(
        self,
        corridor_id: Optional[str] = None,
        target_id: Optional[str] = None,
    ) -> InternationalCorridorHandoffEvent:
        """
        Synthesizes an authentic International Corridor Handoff Event representing
        inter-theater criminal conveyance for Redpanda stream testing.
        """
        corridor = next(
            (c for c in self.corridors if c["corridor_id"] == corridor_id),
            random.choice(self.corridors),
        )
        origin_node = next(n for n in self.nodes if n["id"] == corridor["origin"])
        dest_node = next(n for n in self.nodes if n["id"] == corridor["destination"])

        tid = target_id or f"CONTRABAND-{corridor['syndicate'].value[:3]}-{random.randint(1000, 9999)}"

        return InternationalCorridorHandoffEvent(
            target_id=tid,
            syndicate=corridor["syndicate"],
            modal=corridor["primary_modal"],
            origin_theater=origin_node["theater"],
            destination_theater=dest_node["theater"],
            from_agency=origin_node["agency"],
            to_agency=dest_node["agency"],
            chokepoint=origin_node["name"],
            cargo_manifest={
                "bill_of_lading": f"BL-{random.randint(10000000, 99999999)}",
                "declared_cargo": "Frozen Poultry & Citrus Concentrate",
                "hidden_contraband_kg": random.randint(450, 2200),
                "container_num": f"MSKU{random.randint(1000000, 9999999)}",
            },
            risk_score=float(corridor["risk_level"]),
            latitude=float(origin_node["lat"]),
            longitude=float(origin_node["lon"]),
            operational_summary=(
                f"Multi-agency alert: Suspect shipment linked to {corridor['syndicate'].value} "
                f"departed {origin_node['name']} ({origin_node['theater'].value}) "
                f"via {corridor['primary_modal'].value}. Handed off to {dest_node['agency'].value} "
                f"for interdiction at {dest_node['name']}."
            ),
        )

    def sample_live_osint_events(self, count: int = 5) -> List[InternationalCorridorHandoffEvent]:
        """Generate a batch of diverse international handoff events across corridors."""
        return [self.generate_international_handoff() for _ in range(count)]
