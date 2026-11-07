"""
Project Frontier - Maritime Trajectory Recurrent Anomaly Detector
PyTorch Bi-GRU model for detecting loitering, dark ships, and ship-to-ship rendezvous (Subsistema 01).
"""

from typing import Tuple
import torch
import torch.nn as nn


class MaritimeTrajectoryGRU(nn.Module):
    """
    Bidirectional GRU for sequence-to-probability anomaly detection in AIS data.
    Input: (batch_size, seq_len, feature_dim)
    Features per step: [norm_lat, norm_lon, norm_sog, sin_cog, cos_cog, dark_flag]
    """

    def __init__(
        self,
        feature_dim: int = 6,
        hidden_dim: int = 64,
        num_layers: int = 2,
        dropout: float = 0.2,
    ):
        super().__init__()
        self.feature_dim = feature_dim
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers

        self.gru = nn.GRU(
            input_size=feature_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )

        # Attention layer over recurrent hidden states
        self.attention = nn.Sequential(
            nn.Linear(hidden_dim * 2, 32),
            nn.Tanh(),
            nn.Linear(32, 1),
        )

        # Classification Head: outputs anomaly probability in [0.0, 1.0]
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim * 2, 32),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout),
            nn.Linear(32, 1),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass.
        Returns: anomaly probabilities of shape (batch_size, 1)
        """
        gru_out, _ = self.gru(x)  # (batch_size, seq_len, hidden_dim * 2)

        # Compute attention weights
        attn_weights = torch.softmax(self.attention(gru_out), dim=1)  # (batch_size, seq_len, 1)
        context = torch.sum(gru_out * attn_weights, dim=1)  # (batch_size, hidden_dim * 2)

        prob = self.classifier(context)  # (batch_size, 1)
        return prob.squeeze(-1)
