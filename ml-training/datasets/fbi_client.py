"""
Project Frontier - FBI Wanted API Ingestion Client
Fetches real criminal fugitive profiles, descriptions, aliases, and photos
for facial recognition vector search in Qdrant (Subsistema 04 - Criminal Interstate).
"""

from typing import Any, Dict, List, Optional
import httpx
from pydantic import BaseModel, Field

from shared.config import get_settings


class FBIPersonImage(BaseModel):
    caption: Optional[str] = None
    original: Optional[str] = None
    large: Optional[str] = None
    thumb: Optional[str] = None


class FBIWantedPerson(BaseModel):
    uid: str
    title: str
    description: Optional[str] = None
    subjects: List[str] = Field(default_factory=list)
    reward_text: Optional[str] = None
    aliases: Optional[List[str]] = None
    warning_message: Optional[str] = None
    sex: Optional[str] = None
    race: Optional[str] = None
    nationality: Optional[str] = None
    images: List[FBIPersonImage] = Field(default_factory=list)
    dates_of_birth_used: Optional[List[str]] = None
    field_offices: Optional[List[str]] = None
    url: Optional[str] = None


class FBIWantedClient:
    """Client for official FBI Wanted API."""

    def __init__(self, base_url: str | None = None):
        settings = get_settings()
        self.base_url = base_url or settings.FBI_WANTED_API_BASE

    async def fetch_wanted_list(
        self,
        page: int = 1,
        page_size: int = 20,
        poster_classification: Optional[str] = None,
        timeout: float = 15.0,
    ) -> List[FBIWantedPerson]:
        """
        Fetch fugitives list from https://api.fbi.gov/wanted/v1/list
        """
        params: Dict[str, Any] = {
            "page": page,
            "pageSize": page_size,
        }
        if poster_classification:
            params["poster_classification"] = poster_classification

        url = f"{self.base_url}/list"
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        items = data.get("items") or []
        results: List[FBIWantedPerson] = []

        for item in items:
            raw_images = item.get("images") or []
            img_list = [
                FBIPersonImage(
                    caption=img.get("caption"),
                    original=img.get("original"),
                    large=img.get("large"),
                    thumb=img.get("thumb"),
                )
                for img in raw_images
            ]

            results.append(
                FBIWantedPerson(
                    uid=item.get("uid") or item.get("@id", ""),
                    title=item.get("title", "Unknown"),
                    description=item.get("description"),
                    subjects=item.get("subjects") or [],
                    reward_text=item.get("reward_text"),
                    aliases=item.get("aliases"),
                    warning_message=item.get("warning_message"),
                    sex=item.get("sex"),
                    race=item.get("race"),
                    nationality=item.get("nationality"),
                    images=img_list,
                    dates_of_birth_used=item.get("dates_of_birth_used"),
                    field_offices=item.get("field_offices"),
                    url=item.get("url"),
                )
            )

        return results
