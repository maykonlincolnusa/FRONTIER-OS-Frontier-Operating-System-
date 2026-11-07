"""
Project Frontier - Subsystem 01 (Maritime Coastline)
PyTorch TrajectoryAnomalyLSTM for vessel trajectory anomaly detection (USCG / Navy).
Detects transponder turn-offs (dark ships), erratic zig-zags, and loitering rendezvous.
"""

from typing import Tuple
import torch
import torch.nn as nn


class TrajectoryAnomalyLSTM(nn.Module):
    """
    LSTM-based sequence autoencoder.
    Input: Tensor of shape (batch_size, seq_len, 5) with features:
           [normalized_lat, normalized_lon, normalized_sog, normalized_cog, delta_t]
    """

    def __init__(self, input_dim: int = 5, hidden_dim: int = 64, num_layers: int = 2):
        super().__init__()
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers

        # Encoder: compresses trajectory history into hidden state context
        self.encoder_lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=False,
        )

        # Decoder: reconstructs the expected standard shipping lane sequence
        self.decoder_lstm = nn.LSTM(
            input_size=hidden_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
        )
        self.reconstruction_head = nn.Linear(hidden_dim, input_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass.
        Returns reconstructed sequence of same shape (batch_size, seq_len, 5).
        """
        batch_size, seq_len, _ = x.shape
        _, (hn, cn) = self.encoder_lstm(x)

        # Repeat bottleneck context for decoder input
        context = hn[-1].unsqueeze(1).repeat(1, seq_len, 1)  # (batch_size, seq_len, hidden_dim)
        dec_out, _ = self.decoder_lstm(context)
        reconstruction = self.reconstruction_head(dec_out)
        return reconstruction

    def compute_anomaly_score(self, x: torch.Tensor, threshold: float = 0.05) -> torch.Tensor:
        """
        Calculates reconstruction MSE loss and normalizes via sigmoid to [0.0, 1.0].
        Scores >= 0.70 represent dark ship evasion or loitering rendezvous.
        """
        self.eval()
        with torch.no_grad():
            reconstruction = self.forward(x)
            mse = torch.mean((x - reconstruction) ** 2, dim=(-2, -1))
            score = torch.sigmoid((mse - threshold) * 20.0)
            return torch.clamp(score, 0.0, 1.0)

    def export_to_onnx(self, file_path: str, seq_len: int = 15) -> str:
        """Export model to ONNX format for accelerated cross-platform deployment."""
        self.eval()
        dummy_input = torch.randn(1, seq_len, self.input_dim)
        torch.onnx.export(
            self,
            dummy_input,
            file_path,
            export_params=True,
            opset_version=14,
            input_names=["ais_sequence"],
            output_names=["reconstructed_sequence"],
            dynamic_axes={"ais_sequence": {0: "batch_size", 1: "seq_len"}},
        )
        return file_path

