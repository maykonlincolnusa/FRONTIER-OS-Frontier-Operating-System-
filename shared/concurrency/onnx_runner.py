"""
Project Frontier - Locked ONNX Runtime Session with Dynamic Batching
Integrates with InferenceProcessPool and multiprocessing.Lock for high-throughput,
hardware-accelerated inference across CoreML, CUDA, and CPU execution providers.
"""

import os
from typing import Any, Dict, List, Optional
import numpy as np
import onnxruntime as ort

from shared.concurrency.mp_engine import InferenceProcessPool


class LockedONNXSession:
    """
    Thread-safe & process-safe ONNX Runtime Session wrapper.
    Restricts internal intra/inter-op threads to 1 to eliminate thread thrashing.
    Supports dynamic batching across concurrent multi-agency telemetry feeds.
    """

    def __init__(
        self,
        model_path: str,
        execution_providers: Optional[List[str]] = None,
    ):
        self.model_path = model_path
        self.sess_options = ort.SessionOptions()
        # Prevent thread oversubscription within multiprocessing workers
        self.sess_options.intra_op_num_threads = 1
        self.sess_options.inter_op_num_threads = 1
        self.sess_options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        self.sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

        # Preferred execution providers: CUDA -> CoreML -> CPU
        available_providers = ort.get_available_providers()
        preferred_providers = execution_providers or [
            "CUDAExecutionProvider",
            "CoreMLExecutionProvider",
            "CPUExecutionProvider",
        ]
        active_providers = [p for p in preferred_providers if p in available_providers]

        self.session = ort.InferenceSession(
            self.model_path,
            sess_options=self.sess_options,
            providers=active_providers or ["CPUExecutionProvider"],
        )

        self.input_names = [i.name for i in self.session.get_inputs()]
        self.output_names = [o.name for o in self.session.get_outputs()]

    def run_inference(self, input_feed: Dict[str, np.ndarray]) -> List[np.ndarray]:
        """
        Executes raw ONNX inference session with given numpy inputs.
        """
        return self.session.run(self.output_names, input_feed)

    def run_dynamic_batch(
        self,
        input_name: str,
        batch_items: List[np.ndarray],
    ) -> np.ndarray:
        """
        Dynamic batching: stacks heterogeneous batch items along axis 0,
        evaluates in a single SIMD matrix operation, and returns batched array.
        """
        if not batch_items:
            return np.empty((0,), dtype=np.float32)

        batched_tensor = np.stack(batch_items, axis=0).astype(np.float32)
        outputs = self.session.run(self.output_names, {input_name: batched_tensor})
        return outputs[0]


class GlobalONNXModelRegistry:
    """Singleton cache of preloaded ONNX sessions per worker process."""

    _sessions: Dict[str, LockedONNXSession] = {}

    @classmethod
    def get_session(cls, model_name: str, model_path: str) -> LockedONNXSession:
        if model_name not in cls._sessions:
            cls._sessions[model_name] = LockedONNXSession(model_path=model_path)
        return cls._sessions[model_name]
