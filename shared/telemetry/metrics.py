"""
Project Frontier - Production Observability & Prometheus Metrics
Tracks Deep Learning inference latency, multiprocessing lock contention,
and cross-ring jurisdiction handoff counts.
"""

import time
from contextlib import contextmanager
from typing import Generator
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

# 1. Deep Learning Model Inference Latency Histogram
DL_INFERENCE_LATENCY = Histogram(
    "frontier_dl_inference_latency_seconds",
    "Latency of PyTorch / ONNX Deep Learning model inferences",
    ["model_name"],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0],
)

# 2. Multiprocessing & Distributed Lock Contention Wait Time
MP_LOCK_WAIT_SECONDS = Histogram(
    "frontier_mp_lock_wait_seconds",
    "Time spent waiting to acquire concurrency or distributed locks",
    ["lock_type"],
    buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 2.0],
)

# 3. Inter-Agency Jurisdiction Handoffs Counter
JURISDICTION_HANDOFFS_TOTAL = Counter(
    "frontier_jurisdiction_handoffs_total",
    "Total cross-ring jurisdiction handoff events triggered across PostGIS geofences",
    ["from_ring", "to_ring", "lead_agency"],
)


@contextmanager
def track_inference_latency(model_name: str) -> Generator[None, None, None]:
    """Measure inference latency for an AI model."""
    start = time.perf_counter()
    try:
        yield
    finally:
        duration = time.perf_counter() - start
        DL_INFERENCE_LATENCY.labels(model_name=model_name).observe(duration)


@contextmanager
def track_lock_wait(lock_type: str) -> Generator[None, None, None]:
    """Measure wait time when acquiring a lock."""
    start = time.perf_counter()
    try:
        yield
    finally:
        duration = time.perf_counter() - start
        MP_LOCK_WAIT_SECONDS.labels(lock_type=lock_type).observe(duration)


def record_jurisdiction_handoff(from_ring: str, to_ring: str, lead_agency: str):
    """Increment jurisdiction handoff counter."""
    JURISDICTION_HANDOFFS_TOTAL.labels(
        from_ring=from_ring,
        to_ring=to_ring,
        lead_agency=lead_agency,
    ).inc()


def get_prometheus_metrics() -> bytes:
    """Generate latest Prometheus metrics formatted response."""
    return generate_latest()
