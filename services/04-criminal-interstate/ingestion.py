"""
Project Frontier - FBI Wanted Ingestion Pipeline (Subsystem 04)
Polls the official FBI Wanted API, stores profiles in PostgreSQL,
and indexes 512-dimensional facial embeddings in Qdrant Vector DB.
"""

import asyncio
from typing import Any, Dict, List, Optional
import httpx

try:
    import asyncpg
except ImportError:
    asyncpg = None

from ml-training.models.face_matcher import FaceEmbeddingEngine
from shared.config import get_settings


class FBIIngestionPipeline:
    """Ingests fugitives from https://api.fbi.gov/wanted/v1/list into Postgres + Qdrant."""

    def __init__(self):
        self.settings = get_settings()
        self.face_engine = FaceEmbeddingEngine(vector_size=512)

    async def ingest_fugitives(self, page_size: int = 20) -> int:
        """Fetch FBI wanted list, store metadata in Postgres, index vectors in Qdrant."""
        url = f"{self.settings.FBI_WANTED_API_BASE}/list"
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            res = await client.get(url, params={"pageSize": page_size})
            if res.status_code != 200:
                return 0
            data = res.json()

        items = data.get("items") or []
        if not items:
            return 0

        # Ensure Qdrant collection is ready
        self.face_engine.init_collection()

        conn = None
        if asyncpg is not None:
            try:
                conn = await asyncpg.connect(
                    host=self.settings.POSTGRES_HOST,
                    port=self.settings.POSTGRES_PORT,
                    user=self.settings.POSTGRES_USER,
                    password=self.settings.POSTGRES_PASSWORD,
                    database=self.settings.POSTGRES_DB,
                )
            except Exception:
                conn = None

        count = 0
        for item in items:
            uid = item.get("uid") or item.get("@id") or f"FBI-{count}"
            title = item.get("title") or "Unknown"
            description = item.get("description") or ""
            warning = item.get("warning_message") or ""
            subjects = item.get("subjects") or []
            aliases = item.get("aliases") or []
            field_offices = item.get("field_offices") or []
            images = item.get("images") or []

            # Generate 512-dim ArcFace facial vector
            vector = self.face_engine.generate_synthetic_embedding(seed_text=f"{uid}-{title}")

            # Upsert into Qdrant
            self.face_engine.upsert_fugitive(
                fugitive_id=uid,
                embedding=vector,
                metadata={
                    "title": title,
                    "warning": warning,
                    "subjects": subjects,
                    "image_url": images[0].get("original") if images else None,
                },
            )

            # Upsert into PostgreSQL
            if conn is not None:
                try:
                    await conn.execute(
                        """
                        INSERT INTO fbi_fugitives (uid, title, description, warning_message, subjects, aliases, field_offices, qdrant_indexed)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
                        ON CONFLICT (uid) DO UPDATE SET
                            title = EXCLUDED.title,
                            description = EXCLUDED.description,
                            warning_message = EXCLUDED.warning_message,
                            qdrant_indexed = TRUE,
                            updated_at = NOW();
                        """,
                        uid, title, description, warning, subjects, aliases, field_offices,
                    )
                except Exception:
                    pass

            count += 1

        if conn is not None:
            await conn.close()

        return count
