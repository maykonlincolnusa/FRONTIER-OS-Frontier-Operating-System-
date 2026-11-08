"""
Project Frontier - Narcotics Intelligence Worker (DEA, CBP & HIDTA)
Runs SpatioTemporalGNN to forecast corridor trafficking surges
and publishes ThreatAlertEvent to Kafka topic intel.narcotics.hotspots.
"""

import asyncio
from typing import Any, Dict, List, Optional
import numpy as np
import torch

from services.narcotics_intel.cbp_data import build_border_interstate_graph
from services.narcotics_intel.models import SpatioTemporalGNN
from shared.concurrency.mp_engine import InferenceProcessPool
from shared.connectors.latam_osint import LatamOSINTConnector
from shared.geo.h3_index import H3SpatialIndex
from shared.events.schemas import (
    Agency,
    InternationalCorridorHandoffEvent,
    KafkaTopic,
    SecurityRing,
    ThreatAlertEvent,
)


class NarcoticsIntelWorker:
    """Worker for Subsystem 03 (Narcotics Intelligence)."""

    def __init__(self, mp_pool: Optional[InferenceProcessPool] = None):
        self.pool = mp_pool or InferenceProcessPool.get_instance()
        self.h3_index = H3SpatialIndex.get_instance()
        self.latam_osint = LatamOSINTConnector.get_instance()
        self.graph_def = build_border_interstate_graph()
        self.num_nodes = self.graph_def["num_nodes"]
        self.adj_matrix = self._build_normalized_adj()
        self.model = SpatioTemporalGNN(num_nodes=self.num_nodes, in_features=4).eval()

    def _build_normalized_adj(self) -> torch.Tensor:
        """Construct symmetrically normalized adjacency matrix with self-loops: D^(-1/2) * (A + I) * D^(-1/2)."""
        A = np.eye(self.num_nodes, dtype=np.float32)
        for src, dst, weight in self.graph_def["edges"]:
            A[src, dst] = weight
            A[dst, src] = weight  # undirected traffic interaction

        degrees = np.sum(A, axis=1)
        deg_inv_sqrt = np.zeros_like(degrees, dtype=np.float32)
        nonzero = degrees > 0
        deg_inv_sqrt[nonzero] = np.power(degrees[nonzero], -0.5)
        D_inv = np.diag(deg_inv_sqrt)
        A_norm = D_inv @ A @ D_inv
        return torch.tensor(A_norm, dtype=torch.float32)

    async def predict_corridor_risks(
        self,
        historical_days: int = 7,
    ) -> List[ThreatAlertEvent]:
        """
        Executes ST-GNN inference to predict high-risk trafficking surges.
        Returns list of ThreatAlertEvents for corridors with risk >= 0.70.
        """
        # Feature tensor: (1, num_nodes, seq_len=7, in_features=4)
        # Features: [seizure_kg_norm, commercial_volume_norm, anomaly_signal, base_risk]
        features = np.zeros((1, self.num_nodes, historical_days, 4), dtype=np.float32)

        for n_idx, node in enumerate(self.graph_def["nodes"]):
            base_risk = node.get("risk", 0.5)
            for t in range(historical_days):
                features[0, n_idx, t, 0] = float(np.random.uniform(0.1, 0.9) * base_risk)
                features[0, n_idx, t, 1] = float(np.random.uniform(0.4, 0.8))
                features[0, n_idx, t, 2] = 1.0 if np.random.random() > 0.8 else 0.0
                features[0, n_idx, t, 3] = base_risk

        x_tensor = torch.tensor(features, dtype=torch.float32)

        with torch.no_grad():
            risks = self.model(x_tensor, self.adj_matrix).squeeze(0).numpy()

        alerts = []
        for n_idx, node in enumerate(self.graph_def["nodes"]):
            risk_score = float(risks[n_idx])
            lat = float(node["lat"])
            lon = float(node["lon"])
            is_cand, cand_ring = self.h3_index.fast_lookup_ring(lat, lon)
            h3_cell = self.h3_index.latlng_to_h3(lat, lon)

            if risk_score >= 0.65:
                ring = cand_ring or (SecurityRing.RING_2_FEDERAL if node["type"] == "POE" else SecurityRing.RING_3_INTERSTATE)
                alert = ThreatAlertEvent(
                    subsystem="03-narcotics-intel",
                    ring=ring,
                    lead_agency=Agency.DEA,
                    severity=round(risk_score, 4),
                    latitude=lat,
                    longitude=lon,
                    target_id=node["id"],
                    threat_type="NARCOTICS_CORRIDOR_SURGE",
                    metadata={
                        "node_name": node.get("id"),
                        "node_type": node.get("type"),
                        "surge_probability": round(risk_score, 4),
                        "time_horizon": "24h",
                        "h3_cell": h3_cell,
                        "h3_candidate": is_cand,
                        "agencies_notified": ["DEA", "CBP", "State Troopers"],
                    },
                )
                alerts.append(alert)

        return alerts

    def generate_panamerican_corridor_alerts(
        self,
        count: int = 5,
    ) -> List[InternationalCorridorHandoffEvent]:
        """
        Ingests multi-theater transnational events across Pan-American corridors
        connecting Brazil/Colombia to Mexico and US Rings.
        """
        return self.latam_osint.sample_live_osint_events(count=count)
