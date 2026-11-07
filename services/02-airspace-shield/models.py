"""
Project Frontier - Subsystem 02 (Airspace Shield)
PyTorch FlightPatternAutoencoder for detecting low-altitude clandestine flights (USAF / FAA).
Features: (baro_altitude, velocity, vertical_rate, geo_altitude)
"""

import torch
import torch.nn as nn


class FlightPatternAutoencoder(nn.Module):
    """
    Autoencoder for flight state vector anomaly detection.
    Input: Tensor of shape (batch_size, 4) with features:
           [normalized_baro_alt, normalized_velocity, normalized_vert_rate, normalized_geo_alt]
    """

    def __init__(self, input_dim: int = 4, latent_dim: int = 8):
        super().__init__()
        self.input_dim = input_dim
        self.latent_dim = latent_dim

        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 32),
            nn.BatchNorm1d(32),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Linear(32, 16),
            nn.BatchNorm1d(16),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Linear(16, latent_dim),
        )

        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, 16),
            nn.BatchNorm1d(16),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Linear(16, 32),
            nn.BatchNorm1d(32),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Linear(32, input_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass. Returns reconstructed vector of shape (batch_size, 4)."""
        latent = self.encoder(x)
        return self.decoder(latent)

    def compute_anomaly_score(self, x: torch.Tensor, threshold: float = 0.08) -> torch.Tensor:
        """
        Reconstruction error mapped to [0.0, 1.0].
        Scores >= 0.70 represent low-altitude or radar-evasion flight profiles.
        """
        self.eval()
        with torch.no_grad():
            reconstruction = self.forward(x)
            mse = torch.mean((x - reconstruction) ** 2, dim=-1)
            score = torch.sigmoid((mse - threshold) * 25.0)
            return torch.clamp(score, 0.0, 1.0)

    def export_to_onnx(self, file_path: str) -> str:
        """Export model to ONNX format."""
        self.eval()
        dummy_input = torch.randn(1, self.input_dim)
        torch.onnx.export(
            self,
            dummy_input,
            file_path,
            export_params=True,
            opset_version=14,
            input_names=["flight_state"],
            output_names=["reconstructed_state"],
            dynamic_axes={"flight_state": {0: "batch_size"}},
        )
        return file_path

