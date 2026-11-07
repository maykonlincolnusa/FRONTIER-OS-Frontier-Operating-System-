"""
Project Frontier - Multiprocessing Inference Engine with Concurrency Control
Isolates CPU/GPU-bound PyTorch DL inference from FastAPI async event loop.
Uses multiprocessing context 'spawn' with shared locks and bounded semaphores.
"""

import asyncio
from concurrent.futures import ProcessPoolExecutor
import multiprocessing as mp
import os
import sys
from typing import Any, Callable, Dict, List, Optional, Tuple
import torch

# Global references inside each spawned worker process
_WORKER_LOCK: Optional[Any] = None
_WORKER_SEM: Optional[Any] = None
_WORKER_MODELS: Dict[str, Any] = {}
_WORKER_DEVICE: Optional[torch.device] = None


def get_worker_device() -> torch.device:
    """Detect available accelerator for worker process."""
    if torch.cuda.is_available():
        return torch.device("cuda")
    elif torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def _worker_initializer(lock: Any, semaphore: Any) -> None:
    """
    Initializer executed once when each worker process in the pool spawns.
    Preloads Deep Learning model architectures into worker memory.
    """
    global _WORKER_LOCK, _WORKER_SEM, _WORKER_MODELS, _WORKER_DEVICE
    _WORKER_LOCK = lock
    _WORKER_SEM = semaphore
    _WORKER_DEVICE = get_worker_device()

    # Prevent thread over-subscription inside workers
    torch.set_num_threads(1)
    os.environ["OMP_NUM_THREADS"] = "1"
    os.environ["MKL_NUM_THREADS"] = "1"

    with _WORKER_LOCK:
        try:
            from services.maritime_coastline.models import TrajectoryAnomalyLSTM
            from services.airspace_shield.models import FlightPatternAutoencoder

            maritime_model = TrajectoryAnomalyLSTM(input_dim=5, hidden_dim=64, num_layers=2)
            maritime_model.to(_WORKER_DEVICE).eval()

            flight_model = FlightPatternAutoencoder(input_dim=4, latent_dim=8)
            flight_model.to(_WORKER_DEVICE).eval()

            _WORKER_MODELS["maritime"] = maritime_model
            _WORKER_MODELS["airspace"] = flight_model
        except Exception:
            # Models will be lazily loaded or fallback used
            pass


# Top-level inference worker functions callable across process boundary
def _run_maritime_worker(features: List[List[float]]) -> float:
    """
    Runs maritime AIS sequence inference: (lat, lon, sog, cog, delta_t).
    Protected by worker bounded semaphore for GPU/SHM safety.
    """
    global _WORKER_MODELS, _WORKER_SEM, _WORKER_DEVICE
    device = _WORKER_DEVICE or torch.device("cpu")
    model = _WORKER_MODELS.get("maritime")

    if model is None:
        from services.maritime_coastline.models import TrajectoryAnomalyLSTM
        model = TrajectoryAnomalyLSTM(input_dim=5, hidden_dim=64, num_layers=2).to(device).eval()
        _WORKER_MODELS["maritime"] = model

    tensor = torch.tensor([features], dtype=torch.float32).to(device)

    if _WORKER_SEM is not None:
        with _WORKER_SEM:
            with torch.no_grad():
                return float(model.compute_anomaly_score(tensor).item())
    else:
        with torch.no_grad():
            return float(model.compute_anomaly_score(tensor).item())


def _run_flight_worker(vector: List[float]) -> float:
    """
    Runs airspace state vector inference: (baro_alt, velocity, vertical_rate, geo_alt).
    Protected by worker bounded semaphore.
    """
    global _WORKER_MODELS, _WORKER_SEM, _WORKER_DEVICE
    device = _WORKER_DEVICE or torch.device("cpu")
    model = _WORKER_MODELS.get("airspace")

    if model is None:
        from services.airspace_shield.models import FlightPatternAutoencoder
        model = FlightPatternAutoencoder(input_dim=4, latent_dim=8).to(device).eval()
        _WORKER_MODELS["airspace"] = model

    tensor = torch.tensor([vector], dtype=torch.float32).to(device)

    if _WORKER_SEM is not None:
        with _WORKER_SEM:
            with torch.no_grad():
                return float(model.compute_anomaly_score(tensor).item())
    else:
        with torch.no_grad():
            return float(model.compute_anomaly_score(tensor).item())


class InferenceProcessPool:
    """
    Manages a persistent ProcessPoolExecutor using spawn context,
    with shared locks for concurrent GPU and memory safety.
    """

    _instance: Optional["InferenceProcessPool"] = None

    def __init__(self, max_workers: Optional[int] = None, max_concurrent_gpu: int = 4):
        self.ctx = mp.get_context("spawn")
        self.max_workers = max_workers or max(1, (os.cpu_count() or 4) - 1)
        self.lock = self.ctx.Lock()
        self.semaphore = self.ctx.BoundedSemaphore(max_concurrent_gpu)

        self.executor = ProcessPoolExecutor(
            max_workers=self.max_workers,
            mp_context=self.ctx,
            initializer=_worker_initializer,
            initargs=(self.lock, self.semaphore),
        )

    @classmethod
    def get_instance(cls, max_workers: Optional[int] = None) -> "InferenceProcessPool":
        """Singleton accessor."""
        if cls._instance is None:
            cls._instance = cls(max_workers=max_workers)
        return cls._instance

    async def execute_task(self, func: Callable[..., Any], *args: Any) -> Any:
        """Asynchronously schedule work on the dedicated ProcessPoolExecutor."""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(self.executor, func, *args)

    async def infer_maritime_anomaly(self, features: List[List[float]]) -> float:
        """Execute maritime sequence trajectory inference off-thread."""
        return await self.execute_task(_run_maritime_worker, features)

    async def infer_flight_anomaly(self, vector: List[float]) -> float:
        """Execute airspace flight pattern autoencoder inference off-thread."""
        return await self.execute_task(_run_flight_worker, vector)

    def shutdown(self, wait: bool = True) -> None:
        """Graceful shutdown of process pool."""
        self.executor.shutdown(wait=wait)
        InferenceProcessPool._instance = None
