"""
Project Frontier - Facial Vector Search & Matching Engine
Extracts facial embeddings and manages Qdrant collection for FBI Wanted fugitives (Subsistema 04).
"""

from typing import Any, Dict, List, Optional
import math
import numpy as np

try:
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as qmodels
except ImportError:
    QdrantClient = None
    qmodels = None

from shared.config import get_settings


class FaceEmbeddingEngine:
    """
    Simulates / extracts standardized 512-dimensional facial embedding vectors
    (ArcFace / FaceNet representation) and interacts with Qdrant Vector DB.
    """

    def __init__(self, vector_size: int = 512):
        self.vector_size = vector_size
        self.settings = get_settings()
        self._client: Optional[Any] = None

    @property
    def client(self) -> Any:
        if self._client is None and QdrantClient is not None:
            self._client = QdrantClient(
                host=self.settings.QDRANT_HOST,
                port=self.settings.QDRANT_PORT,
                api_key=self.settings.QDRANT_API_KEY,
                timeout=5.0,
            )
        return self._client

    def generate_synthetic_embedding(self, seed_text: str) -> List[float]:
        """
        Deterministically generate a unit-normalized 512-dim embedding vector
        based on a fugitive ID or string seed (for offline testing & development).
        """
        # Hash seed text to integers
        rng = np.random.RandomState(abs(hash(seed_text)) % (2**32))
        vec = rng.randn(self.vector_size).astype(np.float32)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

    def init_collection(self, collection_name: str | None = None) -> bool:
        """Create Qdrant collection for facial vectors if it does not already exist."""
        if self.client is None or qmodels is None:
            return False

        col_name = collection_name or self.settings.QDRANT_FBI_COLLECTION
        try:
            collections = [c.name for c in self.client.get_collections().collections]
            if col_name not in collections:
                self.client.create_collection(
                    collection_name=col_name,
                    vectors_config=qmodels.VectorParams(
                        size=self.vector_size,
                        distance=qmodels.Distance.COSINE,
                    ),
                )
            return True
        except Exception:
            return False

    def upsert_fugitive(
        self,
        fugitive_id: str,
        embedding: List[float],
        metadata: Dict[str, Any],
        collection_name: str | None = None,
    ) -> bool:
        """Store fugitive face vector and payload in Qdrant."""
        if self.client is None or qmodels is None:
            return False

        col_name = collection_name or self.settings.QDRANT_FBI_COLLECTION
        try:
            point_id = abs(hash(fugitive_id)) % (2**63 - 1)
            self.client.upsert(
                collection_name=col_name,
                points=[
                    qmodels.PointStruct(
                        id=point_id,
                        vector=embedding,
                        payload={
                            "fugitive_id": fugitive_id,
                            **metadata,
                        },
                    )
                ],
            )
            return True
        except Exception:
            return False

    def search_face(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        score_threshold: float = 0.70,
        collection_name: str | None = None,
    ) -> List[Dict[str, Any]]:
        """
        Search for matching faces in Qdrant collection using cosine similarity.
        """
        if self.client is None:
            return []

        col_name = collection_name or self.settings.QDRANT_FBI_COLLECTION
        try:
            hits = self.client.search(
                collection_name=col_name,
                query_vector=query_embedding,
                limit=top_k,
                score_threshold=score_threshold,
            )
            return [
                {
                    "fugitive_id": hit.payload.get("fugitive_id"),
                    "score": hit.score,
                    "payload": hit.payload,
                }
                for hit in hits
            ]
        except Exception:
            return []

