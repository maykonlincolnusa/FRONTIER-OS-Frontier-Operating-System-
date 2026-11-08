"""
Project Frontier - OCI Cloud Infrastructure & Multi-Arch Test Suite
Validates OCI Streaming settings, OCI Object Storage loader, and OKE Kubernetes manifests.
"""

from pathlib import Path
import pytest
import yaml

from shared.config.settings import Settings
from shared.storage.oci_weights_loader import OCIWeightsLoader, ensure_model_weights

ROOT_DIR = Path(__file__).resolve().parent.parent


def test_oci_streaming_kafka_kwargs():
    """Verify OCI Streaming SASL_SSL keyword arguments generation."""
    # Plaintext default
    s_plain = Settings(KAFKA_SECURITY_PROTOCOL="PLAINTEXT")
    kwargs_plain = s_plain.get_kafka_kwargs()
    assert kwargs_plain["bootstrap_servers"] == "localhost:9092"
    assert "security_protocol" not in kwargs_plain

    # OCI Streaming SASL_SSL
    s_oci = Settings(
        KAFKA_BOOTSTRAP_SERVERS="cell-1.streaming.us-ashburn-1.oci.oraclecloud.com:9092",
        KAFKA_SECURITY_PROTOCOL="SASL_SSL",
        KAFKA_SASL_MECHANISM="PLAIN",
        KAFKA_SASL_USERNAME="mytenancy/myuser/ocid1.streampool.oc1...",
        KAFKA_SASL_PASSWORD="my-auth-token-12345",
    )
    kwargs_oci = s_oci.get_kafka_kwargs()
    assert kwargs_oci["security_protocol"] == "SASL_SSL"
    assert kwargs_oci["sasl_mechanism"] == "PLAIN"
    assert kwargs_oci["sasl_plain_username"] == "mytenancy/myuser/ocid1.streampool.oc1..."
    assert kwargs_oci["sasl_plain_password"] == "my-auth-token-12345"
    assert "ssl_context" in kwargs_oci


def test_oci_object_storage_endpoint():
    """Verify S3-compatible OCI Object Storage endpoint URL generation."""
    s = Settings(
        OCI_STORAGE_NAMESPACE="ax93kd092",
        OCI_STORAGE_REGION="sa-saopaulo-1",
    )
    expected_endpoint = "https://ax93kd092.compat.objectstorage.sa-saopaulo-1.oraclecloud.com"
    assert s.oci_s3_endpoint == expected_endpoint


def test_oci_weights_loader_interface():
    """Verify OCI weights loader can inspect and report local/remote weight status."""
    loader = OCIWeightsLoader()
    assert loader is not None
    res = ensure_model_weights()
    assert "maritime_lstm.onnx" in res
    assert "airspace_ae.onnx" in res
    assert "frontier_sat_yolov8.onnx" in res


def test_oke_manifests_syntax_and_schemas():
    """Verify all OKE Kubernetes YAML manifests parse cleanly without errors."""
    manifest_files = [
        ROOT_DIR / "infra" / "oci-oke" / "namespace.yaml",
        ROOT_DIR / "infra" / "oci-oke" / "statefulsets-data.yaml",
        ROOT_DIR / "infra" / "oci-oke" / "deployments-services.yaml",
        ROOT_DIR / "infra" / "oci-oke" / "ingress-oci.yaml",
    ]

    for mfile in manifest_files:
        assert mfile.exists(), f"Missing manifest: {mfile}"
        with open(mfile, "r") as f:
            docs = list(yaml.safe_load_all(f))
            assert len(docs) > 0, f"No documents in {mfile}"
            for doc in docs:
                if doc:
                    assert "apiVersion" in doc
                    assert "kind" in doc
                    assert "metadata" in doc


def test_docker_compose_oci_ampere_syntax():
    """Verify OCI Ampere A1 docker-compose file parses cleanly."""
    compose_file = ROOT_DIR / "infra" / "oci-oke" / "docker-compose.oci-ampere.yml"
    assert compose_file.exists()
    with open(compose_file, "r") as f:
        data = yaml.safe_load(f)
        assert "services" in data
        assert "c2-gateway" in data["services"]
        assert "postgis" in data["services"]
        assert "qdrant" in data["services"]
        # Ensure /dev/shm is configured for multiprocessing
        assert data["services"]["c2-gateway"]["shm_size"] == "2gb"
