#!/usr/bin/env bash
# =============================================================================
# Project Frontier - Download US Census TIGER/Line Shapefiles
# Used by Subsistema 05 (05-geospatial-recon) to populate boundary geometries
# =============================================================================
set -euo pipefail

DEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../data/shapefiles" && pwd)"
mkdir -p "${DEST_DIR}"

echo "[FRONTIER INFRA] Destination directory: ${DEST_DIR}"

# 1. US National Boundary / State Boundaries (2023 500k resolution)
STATES_URL="https://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_us_state_500k.zip"
echo "[FRONTIER INFRA] Downloading US State boundaries from ${STATES_URL}..."
curl -sSL "${STATES_URL}" -o "${DEST_DIR}/cb_2023_us_state_500k.zip" || echo "Note: Network required for download."

# 2. Primary Roads / Interstates
ROADS_URL="https://www2.census.gov/geo/tiger/TIGER2023/PRIMARYROADS/tl_2023_us_primaryroads.zip"
echo "[FRONTIER INFRA] Downloading Primary Interstates from ${ROADS_URL}..."
curl -sSL "${ROADS_URL}" -o "${DEST_DIR}/tl_2023_us_primaryroads.zip" || echo "Note: Network required for download."

echo "[FRONTIER INFRA] Shapefile download task completed."

