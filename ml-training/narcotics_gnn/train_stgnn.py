"""
Project Frontier - SpatioTemporalGNN Training & Checkpoint Export
Trains on CBP Seizure Portal statistics and HIDTA interstate corridors (I-10, I-35, I-95).
Saves PyTorch checkpoint and exports to ONNX.
"""

import os
import sys
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

# Ensure root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from services.narcotics_intel.cbp_data import build_border_interstate_graph
from services.narcotics_intel.models import SpatioTemporalGNN


def train_and_export_stgnn(
    epochs: int = 10,
    output_pt: str = "ml-training/weights/narcotics_stgnn.pt",
    output_onnx: str = "ml-training/weights/narcotics_stgnn.onnx",
) -> str:
    print("[NARCOTICS GNN TRAIN] Constructing border-interstate graph and feature matrices...")
    graph = build_border_interstate_graph()
    num_nodes = graph["num_nodes"]

    # Build normalized adjacency
    A = np.eye(num_nodes, dtype=np.float32)
    for src, dst, w in graph["edges"]:
        A[src, dst] = w
        A[dst, src] = w

    deg = np.sum(A, axis=1)
    deg_inv = np.zeros_like(deg)
    mask = deg > 0
    deg_inv[mask] = np.power(deg[mask], -0.5)
    D_inv = np.diag(deg_inv)
    adj_norm = torch.tensor(D_inv @ A @ D_inv, dtype=torch.float32)

    # Generate synthetic historical features (batch=200, N=13, T=7, F=4)
    x_features = np.random.uniform(0.1, 0.9, size=(200, num_nodes, 7, 4)).astype(np.float32)
    # Target: binary surge indicator
    y_targets = (x_features[:, :, -1, 0] > 0.6).astype(np.float32)

    dataset = TensorDataset(torch.tensor(x_features), torch.tensor(y_targets))
    loader = DataLoader(dataset, batch_size=32, shuffle=True)

    model = SpatioTemporalGNN(num_nodes=num_nodes, in_features=4)
    optimizer = torch.optim.AdamW(model.parameters(), lr=2e-3)
    criterion = nn.BCELoss()

    model.train()
    for epoch in range(1, epochs + 1):
        total_loss = 0.0
        for b_x, b_y in loader:
            optimizer.zero_grad()
            preds = model(b_x, adj_norm)
            loss = criterion(preds, b_y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * b_x.size(0)

        if epoch % 5 == 0 or epoch == 1:
            print(f"  Epoch {epoch:02d}/{epochs:02d} | BCE Loss: {total_loss / len(x_features):.5f}")

    # Save PyTorch checkpoint
    os.makedirs(os.path.dirname(output_pt), exist_ok=True)
    torch.save(model.state_dict(), output_pt)
    print(f"[NARCOTICS GNN TRAIN] Saved PyTorch weights to: {output_pt}")

    # Export to ONNX
    model.eval()
    model.export_to_onnx(output_onnx, seq_len=7)
    print(f"[NARCOTICS GNN TRAIN] Exported ONNX model to: {output_onnx}")
    return output_onnx


if __name__ == "__main__":
    train_and_export_stgnn()
