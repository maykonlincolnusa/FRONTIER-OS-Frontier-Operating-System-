.PHONY: help dev simulate joint-sim seed test docker-up docker-down

help:
	@echo "Project Frontier (FRONTIER-C4ISR) - Tactical Commands"
	@echo "  make dev          - Start C2 Gateway API service on :8000"
	@echo "  make simulate     - Start C2 Gateway and continuously inject telemetry stream"
	@echo "  make joint-sim    - Run 3-Act Multi-Agency Joint Operation Scenario"
	@echo "  make seed         - Seed PostGIS 3-Rings spatial geofences"
	@echo "  make test         - Run Pytest test suite"
	@echo "  make docker-up    - Spin up PostGIS, Redpanda, Qdrant, Redis containers"
	@echo "  make docker-down  - Teardown Docker Compose services"

dev:
	uv run python -m uvicorn services.c2-gateway.main:app --host 0.0.0.0 --port 8000 --reload

simulate:
	./scripts/run_simulation_c2.sh

joint-sim:
	uv run python scripts/simulate_joint_operation.py

seed:
	uv run python infra/scripts/seed_geofences.py

test:
	uv run pytest -q --tb=short

docker-up:
	docker compose up -d

docker-down:
	docker compose down

