"""
Project Frontier - Criminal Interstate Highway Surveillance Worker (FBI, DEA, USDOT)
Processes state 511 traffic camera frames across strategic corridors (I-10, I-35, I-95).
Utilizes multiprocessing with locks to run YOLOv8 ALPR and ArcFace face matching.
"""

import asyncio
from typing import Any, Dict, List, Optional

from ml-training.models.face_matcher import FaceEmbeddingEngine
from shared.concurrency.mp_engine import InferenceProcessPool
from shared.events.schemas import (
    Agency,
    KafkaTopic,
    SecurityRing,
    ThreatAlertEvent,
)


def _cv_frame_worker(camera_id: str, seed_vector: str) -> Dict[str, Any]:
    """
    Simulated CPU/GPU-bound YOLOv8 ALPR + ArcFace facial inference on camera frames.
    Executed in spawned worker process.
    """
    engine = FaceEmbeddingEngine(vector_size=512)
    query_vector = engine.generate_synthetic_embedding(seed_vector)
    # Search local / Qdrant vector space
    matches = engine.search_face(query_vector, top_k=1, score_threshold=0.85)

    if matches:
        match = matches[0]
        return {
            "matched": True,
            "fugitive_id": match.get("fugitive_id"),
            "confidence": float(match.get("score", 0.92)),
            "camera_id": camera_id,
        }

    return {"matched": False, "confidence": 0.0, "camera_id": camera_id}


class InterstateVisionWorker:
    """Worker for Subsystem 04 (Interstate Corridors & Criminal Tracking)."""

    def __init__(self, mp_pool: Optional[InferenceProcessPool] = None):
        self.pool = mp_pool or InferenceProcessPool.get_instance()
        self.match_threshold = 0.80

    async def process_camera_frame(
        self,
        camera_id: str,
        corridor: str,  # I-10, I-35, I-95
        latitude: float,
        longitude: float,
        seed_identity: str,
    ) -> Optional[ThreatAlertEvent]:
        """
        Dispatches CV frame processing to the isolated ProcessPoolExecutor.
        """
        result = await self.pool.execute_task(_cv_frame_worker, camera_id, seed_identity)

        if result.get("matched"):
            fugitive_id = result.get("fugitive_id")
            confidence = result.get("confidence", 0.90)

            return ThreatAlertEvent(
                subsystem="04-criminal-interstate",
                ring=SecurityRing.RING_3_INTERSTATE,
                lead_agency=Agency.FBI,
                severity=round(confidence, 4),
                latitude=latitude,
                longitude=longitude,
                target_id=f"FUGITIVE-{fugitive_id}",
                threat_type="FBI_WANTED_FUGITIVE_SIGHTING",
                metadata={
                    "camera_id": camera_id,
                    "corridor": corridor,
                    "fugitive_id": fugitive_id,
                    "face_similarity": confidence,
                    "lead_jurisdiction": "FBI / State Troopers",
                },
            )

        return None
