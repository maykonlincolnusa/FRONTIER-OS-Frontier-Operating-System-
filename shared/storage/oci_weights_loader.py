"""
Project Frontier (FRONTIER-C4ISR)
OCI Object Storage S3-Compatible Model Weight Loader
====================================================
Downloads and manages Deep Learning model weights (.onnx) from Oracle Cloud
Infrastructure (OCI) Object Storage during container/pod initialization:

- maritime_lstm.onnx (Subsystem 01: Coast Guard / Navy)
- airspace_ae.onnx (Subsystem 02: Airspace Shield / USAF)
- frontier_sat_yolov8.onnx (Subsystem 05: Geospatial Recon / NGA)
"""

from __future__ import annotations

import argparse
import logging
import os
from pathlib import Path
from typing import Dict, List, Optional

try:
    import boto3
    from botocore.client import Config
    from botocore.exceptions import ClientError
except ImportError:
    boto3 = None
    Config = None
    ClientError = Exception

from shared.config import get_settings

logger = logging.getLogger("oci_weights_loader")
logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] [OCI-STORAGE] %(message)s")

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_WEIGHTS_DIR = ROOT_DIR / "ml-training" / "weights"

REQUIRED_MODELS = [
    "maritime_lstm.onnx",
    "airspace_ae.onnx",
    "frontier_sat_yolov8.onnx",
]


class OCIWeightsLoader:
    """
    Manages OCI Object Storage interactions using the S3-compatible API.
    Oracle Cloud provides an S3 Compatibility API for all Object Storage buckets.
    """

    def __init__(self):
        self.settings = get_settings()
        self._s3_client = None

    @property
    def s3_client(self):
        """Lazy-initialize boto3 S3 client configured for OCI Object Storage."""
        if self._s3_client is None:
            if boto3 is None:
                logger.warning("boto3 is not installed; OCI Object Storage downloads disabled.")
                return None

            endpoint = self.settings.oci_s3_endpoint
            if not endpoint:
                logger.debug("No OCI S3 endpoint configured (OCI_STORAGE_NAMESPACE / OCI_STORAGE_ENDPOINT_URL missing).")
                return None

            access_key = self.settings.OCI_STORAGE_ACCESS_KEY
            secret_key = self.settings.OCI_STORAGE_SECRET_KEY

            self._s3_client = boto3.client(
                "s3",
                endpoint_url=endpoint,
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                region_name=self.settings.OCI_STORAGE_REGION,
                config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
            )
        return self._s3_client

    def download_model(self, model_name: str, target_dir: Path | None = None) -> Optional[Path]:
        """
        Download a specific model weight from OCI Object Storage bucket.
        Returns the path to the local file if successful or already present.
        """
        out_dir = target_dir or DEFAULT_WEIGHTS_DIR
        out_dir.mkdir(parents=True, exist_ok=True)
        local_path = out_dir / model_name

        if local_path.exists() and local_path.stat().st_size > 1000:
            logger.info("Model %s already exists locally (%.1f KB).", model_name, local_path.stat().st_size / 1024)
            return local_path

        client = self.s3_client
        if client is None:
            logger.info("OCI Object Storage client not configured. Local model file %s required.", local_path)
            return local_path if local_path.exists() else None

        bucket = self.settings.OCI_STORAGE_BUCKET
        key = f"weights/{model_name}"

        try:
            logger.info("Downloading %s from OCI bucket '%s' (key: %s)...", model_name, bucket, key)
            client.download_file(bucket, key, str(local_path))
            logger.info("Successfully downloaded %s to %s (%.1f KB).", model_name, local_path, local_path.stat().st_size / 1024)
            return local_path
        except Exception as e:
            logger.warning("Could not download %s from OCI Object Storage (%s).", model_name, e)
            return local_path if local_path.exists() else None

    def upload_model(self, local_path: Path, remote_key: Optional[str] = None) -> bool:
        """Upload a local model weight to OCI Object Storage bucket."""
        if not local_path.exists():
            raise FileNotFoundError(f"Local file not found: {local_path}")

        client = self.s3_client
        if client is None:
            raise RuntimeError("OCI Object Storage credentials/endpoint not configured.")

        bucket = self.settings.OCI_STORAGE_BUCKET
        key = remote_key or f"weights/{local_path.name}"

        logger.info("Uploading %s to OCI Object Storage bucket '%s' (key: %s)...", local_path.name, bucket, key)
        client.upload_file(str(local_path), bucket, key)
        logger.info("Uploaded %s successfully.", local_path.name)
        return True


def ensure_model_weights(target_dir: Path | None = None) -> Dict[str, Optional[Path]]:
    """
    Ensures all 3 core Deep Learning model weights (.onnx) are available on disk.
    If missing, attempts to fetch them from OCI Object Storage.
    """
    loader = OCIWeightsLoader()
    results = {}
    for model in REQUIRED_MODELS:
        path = loader.download_model(model, target_dir=target_dir)
        results[model] = path
    return results


def main():
    parser = argparse.ArgumentParser(description="Frontier C4ISR - OCI Object Storage Model Weights Loader")
    parser.add_argument("--all", action="store_true", help="Download all required ONNX model weights")
    parser.add_argument("--model", type=str, help="Download a specific model weight (e.g. maritime_lstm.onnx)")
    parser.add_argument("--upload", type=str, help="Upload a local weight file to OCI Object Storage")
    parser.add_argument("--target-dir", type=str, default=str(DEFAULT_WEIGHTS_DIR), help="Target local directory")

    args = parser.parse_args()
    target_path = Path(args.target_dir)
    loader = OCIWeightsLoader()

    if args.upload:
        loader.upload_model(Path(args.upload))
    elif args.model:
        loader.download_model(args.model, target_dir=target_path)
    else:
        ensure_model_weights(target_dir=target_path)


if __name__ == "__main__":
    main()

