"""
Project Frontier - Multi-Agency Cartel Link Analysis Graph (DEA, FBI, CBP, USCG)
Graph representation connecting maritime vessels, clandestine flights,
border crossing points, vehicles, and FBI Wanted fugitives using NetworkX.
"""

import threading
from typing import Any, Dict, List, Optional
import networkx as nx


class CartelLinkGraph:
    """
    In-memory, thread-safe MultiDiGraph representing illicit trafficking links
    across the 3 Defense-in-Depth Security Rings.
    """

    _instance: Optional["CartelLinkGraph"] = None
    _lock = threading.Lock()

    def __init__(self):
        self.graph = nx.MultiDiGraph()
        self._init_default_cartel_network()

    @classmethod
    def get_instance(cls) -> "CartelLinkGraph":
        """Singleton accessor."""
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def add_node(self, node_id: str, node_type: str, label: str, properties: Dict[str, Any]):
        """Add a typed node to the intelligence graph."""
        with self._lock:
            self.graph.add_node(
                node_id,
                node_type=node_type,
                label=label,
                **properties,
            )

    def add_edge(self, source_id: str, target_id: str, relationship: str, properties: Dict[str, Any]):
        """Add a directed relationship between entities."""
        with self._lock:
            self.graph.add_edge(
                source_id,
                target_id,
                relationship=relationship,
                **properties,
            )

    def get_subgraph(self, root_id: str, max_depth: int = 2) -> Dict[str, Any]:
        """
        Extract k-hop ego network around target_id for Link Analysis Modal.
        Returns nodes and links formatted for D3/Deck.gl visualization.
        """
        with self._lock:
            # Case-insensitive / partial match fallback
            matched_id = None
            for n in self.graph.nodes():
                if root_id.lower() in n.lower() or n.lower() in root_id.lower():
                    matched_id = n
                    break

            if not matched_id:
                matched_id = "FUGITIVE-ALEJANDRO-CASTILLO"

            # Compute ego network
            undirected = self.graph.to_undirected()
            sub_nodes = nx.single_source_shortest_path_length(undirected, matched_id, cutoff=max_depth).keys()
            subgraph = self.graph.subgraph(sub_nodes)

            nodes_data = []
            for n, attrs in subgraph.nodes(data=True):
                nodes_data.append({
                    "id": n,
                    "label": attrs.get("label", n),
                    "node_type": attrs.get("node_type", "ENTITY"),
                    "details": {k: v for k, v in attrs.items() if k not in ["label", "node_type"]},
                })

            links_data = []
            for u, v, k, attrs in subgraph.edges(keys=True, data=True):
                links_data.append({
                    "source": u,
                    "target": v,
                    "relationship": attrs.get("relationship", "ASSOCIATED_WITH"),
                    "details": {k: v for k, v in attrs.items() if k != "relationship"},
                })

            return {
                "root_id": matched_id,
                "node_count": len(nodes_data),
                "edge_count": len(links_data),
                "nodes": nodes_data,
                "links": links_data,
            }

    def _init_default_cartel_network(self):
        """Seed baseline tactical network tying Gulf of Mexico to Interstate 35."""
        # Nodes
        self.graph.add_node(
            "VESSEL-DARK-4091",
            node_type="VESSEL",
            label="Mother Ship (Panama Flag)",
            ring="RING_1_MARITIME",
            agency="USCG",
            threat="AIS_DARK_SHIP",
        )
        self.graph.add_node(
            "GO-FAST-COASTAL-88",
            node_type="VESSEL",
            label="Go-Fast Coastal Launch",
            ring="RING_1_MARITIME",
            agency="USCG / CBP",
            speed_knots=42.0,
        )
        self.graph.add_node(
            "BEACH-SOUTH-PADRE",
            node_type="LOCATION",
            label="South Padre Island Beaching Point",
            ring="RING_2_FEDERAL",
            latitude=26.042,
            longitude=-97.145,
        )
        self.graph.add_node(
            "AIR-CLANDESTINE-88",
            node_type="AIRCRAFT",
            label="Cessna 206 (Radar Masking)",
            ring="RING_2_FEDERAL",
            agency="USAF",
            altitude_ft=450,
        )
        self.graph.add_node(
            "CONVOY-TX-PICKUPS",
            node_type="VEHICLE",
            label="Pickup Convoy (3 Trucks)",
            ring="RING_2_FEDERAL",
            agency="US_ARMY / CBP",
            detected_by="Satellite xView YOLO",
        )
        self.graph.add_node(
            "HIGHWAY-I35",
            node_type="CORRIDOR",
            label="Interstate 35 Northbound",
            ring="RING_3_INTERSTATE",
            agency="USDOT / DEA",
            surge_risk=0.91,
        )
        self.graph.add_node(
            "FUGITIVE-ALEJANDRO-CASTILLO",
            node_type="SUSPECT",
            label="Alejandro Castillo (FBI Top 10)",
            ring="RING_3_INTERSTATE",
            agency="FBI",
            warning="ARMED AND DANGEROUS",
            qdrant_confidence=0.945,
        )

        # Edges
        self.graph.add_edge(
            "VESSEL-DARK-4091",
            "GO-FAST-COASTAL-88",
            relationship="TRANSFERRED_CARGO_TO",
            timestamp="T-45m",
            type="SHIP_TO_SHIP_OFFLOAD",
        )
        self.graph.add_edge(
            "GO-FAST-COASTAL-88",
            "BEACH-SOUTH-PADRE",
            relationship="CROSSED_BORDER_AT",
            timestamp="T-25m",
            ring_handoff="RING_1 -> RING_2",
        )
        self.graph.add_edge(
            "AIR-CLANDESTINE-88",
            "BEACH-SOUTH-PADRE",
            relationship="COORDINATED_LANDING_AT",
            timestamp="T-20m",
            airspace_status="LOW_ALTITUDE",
        )
        self.graph.add_edge(
            "BEACH-SOUTH-PADRE",
            "CONVOY-TX-PICKUPS",
            relationship="LOADED_CARGO_INTO",
            timestamp="T-15m",
            sat_recon="VERIFIED",
        )
        self.graph.add_edge(
            "CONVOY-TX-PICKUPS",
            "HIGHWAY-I35",
            relationship="ENTERED_CORRIDOR",
            timestamp="T-5m",
            ring_handoff="RING_2 -> RING_3",
        )
        self.graph.add_edge(
            "FUGITIVE-ALEJANDRO-CASTILLO",
            "CONVOY-TX-PICKUPS",
            relationship="OPERATING_LEAD_VEHICLE",
            timestamp="T-0m",
            match_score=0.945,
        )
        self.graph.add_edge(
            "FUGITIVE-ALEJANDRO-CASTILLO",
            "HIGHWAY-I35",
            relationship="SIGHTED_AT",
            camera_id="TXDOT-511-MM44",
        )
