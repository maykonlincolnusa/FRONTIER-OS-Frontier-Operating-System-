"""
Project Frontier - Maritime Trajectory LSTM Training & ONNX Export
Preprocesses MarineCadastre AIS time series, trains TrajectoryAnomalyLSTM,
and exports the model to ml-training/weights/maritime_lstm.onnx with dynamic axes.
"""

import os
import sys
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

# Ensure root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from services.maritime_coastline.models import TrajectoryAnomalyLSTM
from ml_training.datasets.synthetic_generator import generate_maritime_dataset


def preprocess_ais_sequences(num_samples: int = 1500, seq_len: int = 20) -> torch.Tensor:
    """
    Sliding window preprocessing for AIS trajectories:
    Features per step: (lat_norm, lon_norm, sog_norm, cog_norm, delta_t_norm).
    """
    raw_dataset = generate_maritime_dataset(num_samples=num_samples, anomaly_ratio=0.15)
    sequence_tensors = []

    for traj in raw_dataset:
        seq = []
        for step in traj[:seq_len]:
            lat_norm = (step["latitude"] - 26.0) / 4.0
            lon_norm = (step["longitude"] - (-90.0)) / 8.0
            sog_norm = step["sog_knots"] / 25.0
            cog_norm = step["cog_deg"] / 360.0
            delta_t_norm = 60.0 / 3600.0  # 1-minute delta
            seq.append([lat_norm, lon_norm, sog_norm, cog_norm, delta_t_norm])

        sequence_tensors.append(seq)

    return torch.tensor(sequence_tensors, dtype=torch.float32)


def train_and_export_maritime_lstm(
    epochs: int = 10,
    batch_size: int = 64,
    output_onnx: str = "ml-training/weights/maritime_lstm.onnx",
) -> str:
    print(f"[MARITIME TRAIN] Generating preprocessed MarineCadastre AIS sequences...")
    x_data = preprocess_ais_sequences(num_samples=1200, seq_len=15)
    loader = DataLoader(TensorDataset(x_data), batch_size=batch_size, shuffle=True)

    device = torch.device("cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu"))
    print(f"[MARITIME TRAIN] Training TrajectoryAnomalyLSTM on: {device}")

    model = TrajectoryAnomalyLSTM(input_dim=5, hidden_dim=64, num_layers=2).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    criterion = nn.MSELoss()

    model.train()
    for epoch in range(1, epochs + 1):
        total_loss = 0.0
        for (batch,) in loader:
            batch = batch.to(device)
            optimizer.zero_grad()
            reconstructed = model(batch)
            loss = criterion(reconstructed, batch)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * batch.size(0)

        if epoch % 5 == 0 or epoch == 1:
            print(f"  Epoch {epoch:02d}/{epochs:02d} | Loss: {total_loss / len(x_data):.5f}")

    # Export to ONNX with dynamic batch and sequence axes
    os.makedirs(os.path.dirname(output_onnx), exist_ok=True)
    model.eval().to("cpu")
    dummy_input = torch.randn(1, 15, 5, dtype=torch.float32)

    torch.onnx.export(
        model,
        dummy_input,
        output_onnx,
        export_params=True,
        opset_version=14,
        input_names=["ais_sequence"],
        output_names=["reconstructed_sequence"],
        dynamic_axes={
            "ais_sequence": {0: "batch_size", 1: "seq_len"},
            "reconstructed_sequence": {0: "batch_size", 1: "seq_len"},
        },
    )
    print(f"[MARITIME TRAIN] Successfully exported ONNX model to: {output_onnx}")
    return output_onnx


if __name__ == "__main__":
    train_and_export_maritime_lstm()

