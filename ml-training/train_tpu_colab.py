"""
Project Frontier - TPU / GPU / MPS Hardware-Agnostic Model Training Script
Optimized for Google Colab TPU v2/v3/v4/v5e via PyTorch XLA with automatic local fallback.
Trains:
1. Airspace Shield Flight Trajectory Autoencoder (Subsistema 02)
2. Maritime Trajectory Bi-GRU Anomaly Detector (Subsistema 01)
"""

import os
import sys
import time
from typing import Tuple

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
import numpy as np

# PyTorch XLA Support for Google Colab TPU
try:
    import torch_xla
    import torch_xla.core.xla_model as xm
    HAS_XLA = True
except ImportError:
    HAS_XLA = False

from ml_training.datasets.synthetic_generator import (
    generate_flight_dataset,
    generate_maritime_dataset,
)
from ml_training.models.flight_autoencoder import FlightTrajectoryAutoencoder
from ml_training.models.maritime_lstm import MaritimeTrajectoryGRU


def get_optimal_device() -> Tuple[torch.device, str]:
    """Detect available accelerator: TPU (Google Colab XLA), CUDA (NVIDIA), MPS (Apple Silicon), or CPU."""
    if HAS_XLA and ("COLAB_TPU_1VM" in os.environ or "TPU_NAME" in os.environ or "XRT_TPU_CONFIG" in os.environ):
        device = xm.xla_device()
        return device, f"TPU (Google Cloud TPU via PyTorch XLA: {xm.xla_real_devices([device])})"
    elif torch.cuda.is_available():
        return torch.device("cuda"), f"GPU (NVIDIA CUDA: {torch.cuda.get_device_name(0)})"
    elif torch.backends.mps.is_available():
        return torch.device("mps"), "Apple Silicon GPU (MPS Accelerated)"
    else:
        return torch.device("cpu"), "CPU (Standard Fallback)"


def prepare_flight_tensors(num_samples: int = 2000, seq_len: int = 25) -> Tuple[torch.Tensor, torch.Tensor]:
    """Prepare normalized tensors for flight autoencoder training."""
    raw_data = generate_flight_dataset(num_samples=num_samples, anomaly_ratio=0.15)
    features_list = []
    labels_list = []

    for traj in raw_data:
        # Features per step (6 dims): [lat_norm, lon_norm, alt_norm, vel_norm, head_sin, head_cos]
        traj_features = []
        is_anomaly = traj[0]["is_anomaly"]
        for pt in traj[:seq_len]:
            lat_norm = (pt["latitude"] - 31.0) / 2.0
            lon_norm = (pt["longitude"] - (-107.0)) / 10.0
            alt_norm = pt["altitude_baro_ft"] / 40000.0
            vel_norm = pt["velocity_knots"] / 500.0
            head_rad = np.radians(pt["heading_deg"])
            traj_features.extend([lat_norm, lon_norm, alt_norm, vel_norm, np.sin(head_rad), np.cos(head_rad)])
        
        features_list.append(traj_features)
        labels_list.append(is_anomaly)

    x = torch.tensor(features_list, dtype=torch.float32)
    y = torch.tensor(labels_list, dtype=torch.float32)
    return x, y


def prepare_maritime_tensors(num_samples: int = 2000, seq_len: int = 25) -> Tuple[torch.Tensor, torch.Tensor]:
    """Prepare normalized tensors for maritime Bi-GRU training."""
    raw_data = generate_maritime_dataset(num_samples=num_samples, anomaly_ratio=0.20)
    features_list = []
    labels_list = []

    for traj in raw_data:
        traj_matrix = []
        is_anomaly = traj[0]["is_anomaly"]
        for pt in traj[:seq_len]:
            lat_norm = (pt["latitude"] - 26.0) / 3.0
            lon_norm = (pt["longitude"] - (-91.0)) / 6.0
            sog_norm = pt["sog_knots"] / 25.0
            cog_rad = np.radians(pt["cog_deg"])
            dark_flag = float(pt["is_dark_ship"])
            traj_matrix.append([lat_norm, lon_norm, sog_norm, np.sin(cog_rad), np.cos(cog_rad), dark_flag])
        
        features_list.append(traj_matrix)
        labels_list.append(is_anomaly)

    x = torch.tensor(features_list, dtype=torch.float32)
    y = torch.tensor(labels_list, dtype=torch.float32)
    return x, y


def train_flight_autoencoder(epochs: int = 15, batch_size: int = 64) -> FlightTrajectoryAutoencoder:
    """Train Flight Trajectory Autoencoder on TPU/GPU accelerator."""
    device, device_desc = get_optimal_device()
    print(f"\n[FRONTIER ML] Training Flight Autoencoder on: {device_desc}")

    x_data, y_labels = prepare_flight_tensors(num_samples=1500)
    # Train primarily on normal flights (is_anomaly == 0) for reconstruction learning
    normal_mask = (y_labels == 0)
    train_x = x_data[normal_mask]

    dataset = TensorDataset(train_x)
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

    input_dim = train_x.shape[1]  # 25 * 6 = 150
    model = FlightTrajectoryAutoencoder(input_dim=input_dim, latent_dim=24).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    criterion = nn.MSELoss()

    model.train()
    for epoch in range(1, epochs + 1):
        total_loss = 0.0
        start_t = time.time()
        for batch in loader:
            batch_x = batch[0].to(device)
            optimizer.zero_grad()
            reconstructed, _ = model(batch_x)
            loss = criterion(reconstructed, batch_x)
            loss.backward()

            if HAS_XLA and "xla" in device.type:
                xm.optimizer_step(optimizer)
                xm.mark_step()
            else:
                optimizer.step()

            total_loss += loss.item() * batch_x.size(0)

        epoch_loss = total_loss / len(train_x)
        elapsed = time.time() - start_t
        if epoch % 5 == 0 or epoch == 1:
            print(f"  Epoch {epoch:02d}/{epochs:02d} | MSE Loss: {epoch_loss:.5f} | Time: {elapsed:.2f}s")

    # Evaluate anomaly discrimination
    model.eval()
    with torch.no_grad():
        test_x = x_data.to(device)
        scores = model.compute_anomaly_score(test_x).cpu().numpy()
        actual = y_labels.numpy()
        normal_scores = scores[actual == 0]
        anomaly_scores = scores[actual == 1]
        print(f"  [Validation] Normal Mean Score: {normal_scores.mean():.4f} | Anomaly Mean Score: {anomaly_scores.mean():.4f}")

    return model


def train_maritime_gru(epochs: int = 15, batch_size: int = 64) -> MaritimeTrajectoryGRU:
    """Train Maritime Bi-GRU Anomaly Detector on TPU/GPU accelerator."""
    device, device_desc = get_optimal_device()
    print(f"\n[FRONTIER ML] Training Maritime Bi-GRU on: {device_desc}")

    x_data, y_labels = prepare_maritime_tensors(num_samples=1500)
    dataset = TensorDataset(x_data, y_labels)
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

    model = MaritimeTrajectoryGRU(feature_dim=6, hidden_dim=64, num_layers=2).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=2e-3, weight_decay=1e-4)
    criterion = nn.BCELoss()

    model.train()
    for epoch in range(1, epochs + 1):
        total_loss = 0.0
        start_t = time.time()
        for batch_x, batch_y in loader:
            batch_x = batch_x.to(device)
            batch_y = batch_y.to(device)

            optimizer.zero_grad()
            preds = model(batch_x)
            loss = criterion(preds, batch_y)
            loss.backward()

            if HAS_XLA and "xla" in device.type:
                xm.optimizer_step(optimizer)
                xm.mark_step()
            else:
                optimizer.step()

            total_loss += loss.item() * batch_x.size(0)

        epoch_loss = total_loss / len(x_data)
        elapsed = time.time() - start_t
        if epoch % 5 == 0 or epoch == 1:
            print(f"  Epoch {epoch:02d}/{epochs:02d} | BCE Loss: {epoch_loss:.5f} | Time: {elapsed:.2f}s")

    return model


if __name__ == "__main__":
    print("=" * 70)
    print("PROJECT FRONTIER - TPU / ACCELERATOR TRAINING PIPELINE")
    print("=" * 70)
    os.makedirs("ml-training/weights", exist_ok=True)

    flight_model = train_flight_autoencoder(epochs=15)
    torch.save(flight_model.state_dict(), "ml-training/weights/flight_autoencoder.pt")
    print("Saved: ml-training/weights/flight_autoencoder.pt")

    maritime_model = train_maritime_gru(epochs=15)
    torch.save(maritime_model.state_dict(), "ml-training/weights/maritime_gru.pt")
    print("Saved: ml-training/weights/maritime_gru.pt")
    print("\nTraining completed successfully.")

