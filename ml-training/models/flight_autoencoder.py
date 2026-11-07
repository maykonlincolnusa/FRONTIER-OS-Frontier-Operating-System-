"""
Project Frontier - Airspace Shield Flight Trajectory Autoencoder
PyTorch Deep Autoencoder for unsupervised flight anomaly detection (Subsistema 02).
Reconstructs standard flight profiles; high reconstruction error signals illicit/clandestine flights.
"""

from typing import Tuple
import torch
import torch.nn as nn


class FlightTrajectoryAutoencoder(nn.Module):
    """
    Deep Autoencoder for sequence-level flight anomaly detection.
    Input: Tensor of shape (batch_size, seq_len * num_features) or (batch_size, input_dim)
    """

    def __init__(self, input_dim: int = 140, latent_dim: int = 16):
        super().__init__()
        self.input_dim = input_dim
        self.latent_dim = latent_dim

        # Encoder: compress high-dimensional trajectory into latent bottleneck
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 96),
            nn.BatchNorm1d(96),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Dropout(0.1),
            nn.Linear(96, 48),
            nn.BatchNorm1d(48),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Linear(48, latent_dim),
        )

        # Decoder: reconstruct expected normal flight trajectory
        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, 48),
            nn.BatchNorm1d(48),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Linear(48, 96),
            nn.BatchNorm1d(96),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Linear(96, input_dim),
        )

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Forward pass.
        Returns: (reconstructed_x, latent_representation)
        """
        latent = self.encoder(x)
        reconstructed = self.decoder(latent)
        return reconstructed, latent

    def compute_anomaly_score(
        self,
        x: torch.Tensor,
        threshold: float = 0.08,
    ) -> torch.Tensor:
        """
        Compute normalized risk score [0.0, 1.0] based on reconstruction error (MSE).
        """
        self.eval()
        with torch.no_grad():
            reconstructed, _ = self.forward(x)
            mse = torch.mean((x - reconstructed) ** 2, dim=-1)
            # Map MSE via sigmoid centered around threshold
            scores = torch.sigmoid((mse - threshold) * 25.0)
            return torch.clamp(scores, 0.0, 1.0)

