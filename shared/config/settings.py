"""
Project Frontier - System Configuration Settings
Pydantic Settings v2 for Base Infrastructure and Microservices
"""

from functools import lru_cache
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Global configuration settings for Frontier C4ISR System of Systems."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # General Environment
    ENVIRONMENT: str = Field(default="development", description="development | staging | production")
    LOG_LEVEL: str = Field(default="INFO")
    DEBUG: bool = Field(default=False)

    # PostgreSQL + PostGIS
    POSTGRES_HOST: str = Field(default="localhost")
    POSTGRES_PORT: int = Field(default=5432)
    POSTGRES_DB: str = Field(default="frontier_c4isr")
    POSTGRES_USER: str = Field(default="frontier")
    POSTGRES_PASSWORD: str = Field(default="frontier_c4isr_secret")
    DATABASE_URL: Optional[str] = None
    DATABASE_SYNC_URL: Optional[str] = None

    # Redpanda / Kafka Event Bus
    KAFKA_BOOTSTRAP_SERVERS: str = Field(default="localhost:9092")
    KAFKA_CONSUMER_GROUP_PREFIX: str = Field(default="frontier-c4isr")
    KAFKA_SCHEMA_REGISTRY_URL: str = Field(default="http://localhost:8081")

    # Qdrant Vector DB
    QDRANT_HOST: str = Field(default="localhost")
    QDRANT_PORT: int = Field(default=6333)
    QDRANT_GRPC_PORT: int = Field(default=6334)
    QDRANT_API_KEY: Optional[str] = None
    QDRANT_FBI_COLLECTION: str = Field(default="fbi_wanted_faces")
    QDRANT_REPORTS_COLLECTION: str = Field(default="intel_reports_semantic")

    # Redis (Cache, C2 WebSocket pubsub)
    REDIS_HOST: str = Field(default="localhost")
    REDIS_PORT: int = Field(default=6379)
    REDIS_URL: Optional[str] = None

    # Public External APIs
    FBI_WANTED_API_BASE: str = Field(default="https://api.fbi.gov/wanted/v1")
    OPENSKY_API_BASE: str = Field(default="https://opensky-network.org/api")
    OPENSKY_USERNAME: Optional[str] = None
    OPENSKY_PASSWORD: Optional[str] = None

    # C2 Gateway & API Service Defaults
    C2_GATEWAY_HOST: str = Field(default="0.0.0.0")
    C2_GATEWAY_PORT: int = Field(default=8000)

    @property
    def async_database_url(self) -> str:
        """Construct or return the async SQLAlchemy database URL (asyncpg)."""
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
            f"{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def sync_database_url(self) -> str:
        """Construct or return the sync SQLAlchemy database URL (psycopg2)."""
        if self.DATABASE_SYNC_URL:
            return self.DATABASE_SYNC_URL
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
            f"{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def redis_connection_url(self) -> str:
        """Construct or return the Redis connection URL."""
        if self.REDIS_URL:
            return self.REDIS_URL
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"


@lru_cache()
def get_settings() -> Settings:
    """Return cached Settings instance."""
    return Settings()

