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

    # Redpanda / Kafka / OCI Streaming Event Bus
    KAFKA_BOOTSTRAP_SERVERS: str = Field(default="localhost:9092")
    KAFKA_CONSUMER_GROUP_PREFIX: str = Field(default="frontier-c4isr")
    KAFKA_SCHEMA_REGISTRY_URL: str = Field(default="http://localhost:8081")
    # OCI Streaming (Oracle Cloud Managed Kafka) SASL_SSL parameters
    KAFKA_SECURITY_PROTOCOL: str = Field(default="PLAINTEXT", description="PLAINTEXT | SASL_SSL")
    KAFKA_SASL_MECHANISM: str = Field(default="PLAIN", description="PLAIN | SCRAM-SHA-256")
    KAFKA_SASL_USERNAME: Optional[str] = Field(
        default=None,
        description="OCI Streaming format: <tenancy_name>/<username>/<stream_pool_ocid>"
    )
    KAFKA_SASL_PASSWORD: Optional[str] = Field(
        default=None,
        description="OCI Auth Token"
    )

    # Google Cloud Architecture (Cloud Run, GKE Autopilot, Cloud SQL pgvector, Cloud Storage, BigQuery)
    GCP_PROJECT_ID: Optional[str] = Field(default=None, description="Google Cloud Project ID")
    GCP_REGION: str = Field(default="us-central1", description="Default Google Cloud Region")
    GCS_WEIGHTS_BUCKET: str = Field(default="frontier-c4isr-weights", description="Google Cloud Storage Bucket for ONNX weights")
    GCP_ARTIFACT_REGISTRY: str = Field(
        default="us-central1-docker.pkg.dev",
        description="Google Cloud Artifact Registry hostname"
    )
    BIGQUERY_DATASET: str = Field(default="frontier_intel", description="BigQuery dataset for audit telemetry")

    # Legacy / Secondary Object Storage (S3-Compatible API)
    OCI_STORAGE_NAMESPACE: Optional[str] = Field(default=None, description="Tenancy Namespace")
    OCI_STORAGE_REGION: str = Field(default="us-ashburn-1", description="OCI Region identifier")
    OCI_STORAGE_BUCKET: str = Field(default="frontier-model-weights")
    OCI_STORAGE_ACCESS_KEY: Optional[str] = Field(default=None, description="OCI Customer Secret Key (Access Key)")
    OCI_STORAGE_SECRET_KEY: Optional[str] = Field(default=None, description="OCI Customer Secret Key (Secret)")
    OCI_STORAGE_ENDPOINT_URL: Optional[str] = None

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

    def get_kafka_kwargs(self) -> dict:
        """
        Construct aiokafka client keyword arguments supporting both local Redpanda (PLAINTEXT)
        and OCI Streaming (SASL_SSL with PLAIN authentication).
        """
        kwargs: dict = {
            "bootstrap_servers": self.KAFKA_BOOTSTRAP_SERVERS,
        }
        if self.KAFKA_SECURITY_PROTOCOL.upper() == "SASL_SSL":
            import certifi
            import ssl

            ssl_ctx = ssl.create_default_context(cafile=certifi.where())
            kwargs.update({
                "security_protocol": "SASL_SSL",
                "sasl_mechanism": self.KAFKA_SASL_MECHANISM,
                "sasl_plain_username": self.KAFKA_SASL_USERNAME,
                "sasl_plain_password": self.KAFKA_SASL_PASSWORD,
                "ssl_context": ssl_ctx,
            })
        return kwargs

    @property
    def oci_s3_endpoint(self) -> Optional[str]:
        """Construct or return the S3-compatible OCI Object Storage endpoint URL."""
        if self.OCI_STORAGE_ENDPOINT_URL:
            return self.OCI_STORAGE_ENDPOINT_URL
        if self.OCI_STORAGE_NAMESPACE:
            return f"https://{self.OCI_STORAGE_NAMESPACE}.compat.objectstorage.{self.OCI_STORAGE_REGION}.oraclecloud.com"
        return None


@lru_cache()
def get_settings() -> Settings:
    """Return cached Settings instance."""
    return Settings()

