"""
Project Frontier (FRONTIER-C4ISR)
Google Cloud Storage (GCS) Model Weights & Telemetry Loader
===========================================================
Downloads, synchronizes, and uploads Deep Learning model weights (.onnx)
and continuous learning datasets using Google Cloud Storage:

- gs://frontier-c4isr-weights/airspace_ae.onnx
- gs://frontier-c4isr-weights/maritime_lstm.onnx
- gs://frontier-c4isr-weights/narcotics_stgnn.onnx
- gs://frontier-c4isr-weights/frontier_sat_yolov8.onnx
"""

from __future__ import annotations

import argparse
import logging
import os
from pathlib import Path
from typing import Dict, List, Optional

from shared.config import get_settings

logger = logging.getLogger("gcs_weights_loader")
logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] [GCP-GCS] %(message)s")

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DEPLOYMENT_WEIGHTS_DIR = ROOT_DIR / "frontier_c4isr_deployment" / "weights"
LEGACY_WEIGHTS_DIR = ROOT_DIR / "ml-training" / "weights"

REQUIRED_MODELS = [
    "maritime_lstm.onnx",
    "airspace_ae.onnx",
    "narcotics_stgnn.onnx",
    "frontier_sat_yolov8.onnx",
]


class GCSWeightsLoader:
    """
    Manages Google Cloud Storage interactions for ONNX weights and continuous learning packages.
    Supports google-cloud-storage SDK with seamless fallback to local weights.
    """

    def __init__(self):
        self.settings = get_settings()
        self._gcs_client = None

    @property
    def gcs_client(self):
        """Lazy-initialize Google Cloud Storage client."""
        if self._gcs_client is None:
            try:
                from google.cloud import storage
                self._gcs_client = storage.Client(project=self.settings.GCP_PROJECT_ID)
            except Exception as e:
                logger.debug("Google Cloud Storage client not initialized (%s). Using local weights.", e)
                self._gcs_client = None
        return self._gcs_client

    def ensure_weights(self, target_dir: Optional[Path] = None) -> Dict[str, bool]:
        """
        Verify that all 4 Colab-trained ONNX models are present.
        First checks frontier_c4isr_deployment/weights, then GCS if configured.
        """
        dest_dir = target_dir or DEPLOYMENT_WEIGHTS_DIR
        dest_dir.mkdir(parents=True, exist_ok=True)

        results: Dict[str, bool] = {}

        for model_name in REQUIRED_MODELS:
            local_path = dest_dir / model_name
            legacy_path = LEGACY_WEIGHTS_DIR / model_name

            if local_path.exists() and local_path.stat().st_size > 0:
                results[model_name] = True
                continue

            if legacy_path.exists() and legacy_path.stat().st_size > 0:
                # Copy or symlink to deployment directory
                try:
                    local_path.write_bytes(legacy_path.read_bytes())
                    results[model_name] = True
                    continue
                except Exception:
                    pass

            # Try GCS download if client available
            if self.gcs_client:
                try:
                    bucket = self.gcs_client.bucket(self.settings.GCS_WEIGHTS_BUCKET)
                    blob = bucket.blob(f"weights/{model_name}")
                    if blob.exists():
                        blob.download_to_filename(str(local_path))
                        logger.info("Downloaded %s from gs://%s/weights/", model_name, self.settings.GCS_WEIGHTS_BUCKET)
                        results[model_name] = True
                        continue
                except Exception as e:
                    logger.warning("GCS download failed for %s: %s", model_name, e)

            results[model_name] = local_path.exists()

        return results

    def upload_weight(self, local_file: Path, remote_key: Optional[str] = None) -> bool:
        """Upload a local .onnx weight file to Google Cloud Storage bucket."""
        if not self.gcs_client:
            logger.warning("GCS client not available. Cannot upload.")
            return False

        key = remote_key or f"weights/{local_file.name}"
        bucket = self.gcs_client.bucket(self.settings.GCS_WEIGHTS_BUCKET)
        blob = bucket.blob(key)
        blob.upload_from_filename(str(local_file))
        logger.info("Uploaded %s to gs://%s/%s", local_file.name, self.settings.GCS_WEIGHTS_BUCKET, key)
        return True


def ensure_model_weights(target_dir: Optional[Path] = None) -> Dict[str, bool]:
    loader = GCSWeightsLoader()
    return loader.ensure_weights(target_dir=target_dir)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Frontier C4ISR - Google Cloud Storage Weights Loader")
    parser.add_argument("--check", action="store_true", help="Check and ensure all model weights are present")
    parser.add_argument("--upload", type=str, help="Upload local file to GCS weights bucket")
    args = parser.parse_args()

    loader = GCSWeightsLoader()
    if args.upload:
        p = Path(args.upload)
        if p.exists():
            loader.upload_weight(p)
        else:
            print(f"File not found: {p}")
    else:
        status = loader.ensure_weights()
        for k, v in status.items():
            print(f"  [{'OK' if v else 'MISSING'}] {k}")
