"""
Project Frontier - Subsystem 03 (Narcotics Intelligence)
PyTorch SpatioTemporalGNN for border-to-interior narcotics trafficking flow forecasting.
Combines Graph Convolutions across POEs and Highway Corridors with Temporal Sequence Modeling.
"""

from typing import Tuple
import torch
import torch.nn as nn
import torch.nn.functional as F


class GraphConvolutionLayer(nn.Module):
    """Spatial Graph Convolution: H' = A * H * W + b."""

    def __init__(self, in_features: int, out_features: int):
        super().__init__()
        self.weight = nn.Parameter(torch.FloatTensor(in_features, out_features))
        self.bias = nn.Parameter(torch.FloatTensor(out_features))
        self.reset_parameters()

    def reset_parameters(self):
        nn.init.kaiming_uniform_(self.weight, a=1.0)
        nn.init.zeros_(self.bias)

    def forward(self, x: torch.Tensor, adj: torch.Tensor) -> torch.Tensor:
        # x shape: (batch_size, num_nodes, in_features)
        # adj shape: (num_nodes, num_nodes)
        support = torch.matmul(x, self.weight)  # (batch_size, num_nodes, out_features)
        output = torch.matmul(adj, support)     # (batch_size, num_nodes, out_features)
        return output + self.bias


class SpatioTemporalGNN(nn.Module):
    """
    Spatio-Temporal Graph Neural Network for predicting 24-hour narcotics surge risks.
    Input:
      - x: (batch_size, num_nodes, seq_len, in_features)
      - adj: (num_nodes, num_nodes) normalized adjacency matrix
    Output:
      - probabilities: (batch_size, num_nodes) in [0.0, 1.0]
    """

    def __init__(
        self,
        num_nodes: int = 13,
        in_features: int = 4,
        spatial_dim: int = 32,
        temporal_dim: int = 32,
    ):
        super().__init__()
        self.num_nodes = num_nodes
        self.gcn1 = GraphConvolutionLayer(in_features, spatial_dim)
        self.gcn2 = GraphConvolutionLayer(spatial_dim, spatial_dim)

        self.temporal_gru = nn.GRU(
            input_size=spatial_dim,
            hidden_size=temporal_dim,
            num_layers=1,
            batch_first=True,
        )

        self.classifier = nn.Sequential(
            nn.Linear(temporal_dim, 16),
            nn.ReLU(inplace=True),
            nn.Linear(16, 1),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor, adj: torch.Tensor) -> torch.Tensor:
        # x: (B, N, T, in_features)
        B, N, T, in_feat = x.shape
        # Transpose to process each time step with GCN: (B, T, N, in_features)
        x_perm = x.permute(0, 2, 1, 3).contiguous().view(B * T, N, in_feat)

        # Spatial convolutions
        h1 = F.relu(self.gcn1(x_perm, adj))
        h2 = F.relu(self.gcn2(h1, adj))  # (B * T, N, spatial_dim)

        # Reshape for Temporal sequence modeling: (B, N, T, spatial_dim)
        spatial_out = h2.view(B, T, N, -1).permute(0, 2, 1, 3).contiguous().view(B * N, T, -1)

        # Temporal GRU
        _, h_n = self.temporal_gru(spatial_out)  # h_n: (1, B * N, temporal_dim)
        context = h_n.squeeze(0)                 # (B * N, temporal_dim)

        # Risk score per node
        risk = self.classifier(context).view(B, N)  # (B, N) in [0.0, 1.0]
        return risk

    def export_to_onnx(self, file_path: str, seq_len: int = 7) -> str:
        """Export ST-GNN architecture to ONNX."""
        self.eval()
        dummy_x = torch.randn(1, self.num_nodes, seq_len, 4)
        dummy_adj = torch.eye(self.num_nodes)
        torch.onnx.export(
            self,
            (dummy_x, dummy_adj),
            file_path,
            export_params=True,
            opset_version=14,
            input_names=["node_features", "adjacency_matrix"],
            output_names=["corridor_risks"],
            dynamic_axes={"node_features": {0: "batch_size"}},
        )
        return file_path
