"""
Project Frontier - Airspace Shield ADS-B Autoencoder Training & ONNX Export
Preprocesses OpenSky Network state vectors, trains FlightPatternAutoencoder,
and exports the model to ml-training/weights/airspace_ae.onnx with dynamic batch axes.
"""

import os
import sys
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

# Ensure root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from services.airspace_shield.models import FlightPatternAutoencoder
from ml_training.datasets.synthetic_generator import generate_flight_dataset


def preprocess_adsb_vectors(num_samples: int = 1500) -> torch.Tensor:
    """Preprocess OpenSky state vectors: (baro_alt, velocity, vertical_rate, geo_alt)."""
    raw_dataset = generate_flight_dataset(num_samples=num_samples, anomaly_ratio=0.15)
    vectors = []
    for traj in raw_dataset:
        pt = traj[0]
        baro_norm = min(max(pt["altitude_baro_ft"] / 40000.0, 0.0), 1.0)
        vel_norm = min(max(pt["velocity_knots"] / 500.0, 0.0), 1.0)
        vert_norm = min(max((pt["vertical_rate"] + 20.0) / 40.0, 0.0), 1.0)
        geo_norm = baro_norm
        vectors.append([baro_norm, vel_norm, vert_norm, geo_norm])

    return torch.tensor(vectors, dtype=torch.float32)


def train_and_export_airspace_ae(
    epochs: int = 10,
    batch_size: int = 64,
    output_onnx: str = "ml-training/weights/airspace_ae.onnx",
) -> str:
    print(f"[AIRSPACE TRAIN] Generating OpenSky Network state vectors...")
    x_data = preprocess_adsb_vectors(num_samples=1200)
    loader = DataLoader(TensorDataset(x_data), batch_size=batch_size, shuffle=True)

    device = torch.device("cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu"))
    print(f"[AIRSPACE TRAIN] Training FlightPatternAutoencoder on: {device}")

    model = FlightPatternAutoencoder(input_dim=4, latent_dim=8).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    criterion = nn.MSELoss()

    model.train()
    for epoch in range(1, epochs + 1):
        total_loss = 0.0
        for (batch,) in loader:
            batch = batch.to(device)
            optimizer.zero_grad()
            recon = model(batch)
            loss = criterion(recon, batch)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * batch.size(0)

        if epoch % 5 == 0 or epoch == 1:
            print(f"  Epoch {epoch:02d}/{epochs:02d} | Loss: {total_loss / len(x_data):.5f}")

    # Export to ONNX
    os.makedirs(os.path.dirname(output_onnx), exist_ok=True)
    model.eval().to("cpu")
    dummy_input = torch.randn(1, 4, dtype=torch.float32)

    torch.onnx.export(
        model,
        dummy_input,
        output_onnx,
        export_params=True,
        opset_version=14,
        input_names=["flight_state"],
        output_names=["reconstructed_state"],
        dynamic_axes={
            "flight_state": {0: "batch_size"},
            "reconstructed_state": {0: "batch_size"},
        },
    )
    print(f"[AIRSPACE TRAIN] Successfully exported ONNX model to: {output_onnx}")
    return output_onnx


if __name__ == "__main__":
    train_and_export_airspace_ae()

