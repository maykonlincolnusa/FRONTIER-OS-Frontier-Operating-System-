"""
Project Frontier - Real US Government Datasets Test Suite
Validates authentic data structures, schemas, and processing engines.
"""

from pathlib import Path
import numpy as np
import pandas as pd
import pytest

from infra.scripts.download_real_gov_datasets import (
    _extract_image_embedding,
    ROOT_DIR,
)


def test_visual_embedding_extraction():
    """Verify 512-dim normalized embedding extraction logic."""
    vec = _extract_image_embedding(image_path=None, seed_str="FBI-TEST-12345")
    assert len(vec) == 512
    norm = np.linalg.norm(vec)
    assert abs(norm - 1.0) < 1e-4


def test_opensky_parquet_schema():
    """Verify OpenSky border flights parquet structure if generated."""
    parquet_path = ROOT_DIR / "data" / "raw" / "opensky" / "border_flights_real.parquet"
    if parquet_path.exists():
        df = pd.read_parquet(parquet_path)
        assert len(df) > 0
        expected_cols = {"icao24", "callsign", "longitude", "latitude", "velocity"}
        assert expected_cols.issubset(set(df.columns))


def test_marinecadastre_ais_schema():
    """Verify MarineCadastre AIS vessel traffic parquet structure."""
    parquet_path = ROOT_DIR / "data" / "raw" / "ais" / "uscg_ais_sample.parquet"
    if parquet_path.exists():
        df = pd.read_parquet(parquet_path)
        assert len(df) > 0
        expected_cols = {"MMSI", "BaseDateTime", "LAT", "LON", "SOG", "COG"}
        assert expected_cols.issubset(set(df.columns))
        # Ensure coordinates are within valid geographic bounds
        assert (df["LAT"].between(-90, 90)).all()
        assert (df["LON"].between(-180, 180)).all()


def test_cbp_drug_seizures_data():
    """Verify CBP drug seizures dataset format."""
    parquet_path = ROOT_DIR / "data" / "raw" / "cbp" / "drug_seizures_real.parquet"
    if parquet_path.exists():
        df = pd.read_parquet(parquet_path)
        assert len(df) > 0
        assert "Drug Type" in df.columns
        assert "Sum Qty (lbs)" in df.columns


def test_usgs_satellite_recon_samples():
    """Verify USGS high-resolution satellite imagery files exist with valid dimensions."""
    sat_dir = ROOT_DIR / "data" / "raw" / "satellite_samples"
    manifest_path = sat_dir / "satellite_manifest.json"
    if manifest_path.exists():
        import json
        with open(manifest_path, "r") as f:
            manifest = json.load(f)
        assert len(manifest) >= 5
        for item in manifest:
            img_file = ROOT_DIR / item["file"]
            assert img_file.exists()
            assert img_file.stat().st_size > 10000  # greater than 10KB

