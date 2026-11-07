#!/usr/bin/env bash
# =============================================================================
# Project Frontier - End-to-End Tactical C2 Simulation Runner
# Starts the C2 Gateway and continuously streams telemetry to the Dashboard
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

echo "================================================================================"
echo " PROJECT FRONTIER (FRONTIER-C4ISR) - END-TO-END TACTICAL C2 SIMULATION"
echo "================================================================================"

# Check if C2 Gateway is already listening on port 8000
if curl -s http://localhost:8000/healthz >/dev/null 2>&1; then
    echo "[FRONTIER C2] C2 Gateway is already running on http://localhost:8000"
else
    echo "[FRONTIER C2] Starting C2 Gateway FastAPI Service on port 8000..."
    uv run python -m uvicorn services.c2-gateway.main:app --host 0.0.0.0 --port 8000 &
    GATEWAY_PID=$!
    trap "kill ${GATEWAY_PID} 2>/dev/null || true" EXIT
    sleep 2
fi

echo "[FRONTIER C2] Seeding PostGIS 3-Rings Geofences..."
uv run python infra/scripts/seed_geofences.py || true

echo "[FRONTIER C2] Starting continuous telemetry injection across the 3 Security Rings..."
echo "Open the Tactical Dashboard at: http://localhost:3000"
echo "WebSocket feed streaming on: ws://localhost:8000/ws/c2-stream"
echo "Press Ctrl+C to terminate."

uv run python scripts/inject_c2_telemetry.py http://localhost:8000
