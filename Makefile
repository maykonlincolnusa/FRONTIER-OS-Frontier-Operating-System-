.PHONY: help dev simulate joint-sim seed test docker-up docker-down download-gov-data oci-deploy-vm oci-deploy-oke

help:
	@echo "Project Frontier (FRONTIER-C4ISR) - Tactical Commands"
	@echo "  make dev               - Start C2 Gateway API service on :8000"
	@echo "  make simulate          - Start C2 Gateway and continuously inject telemetry stream"
	@echo "  make joint-sim         - Run 3-Act Multi-Agency Joint Operation Scenario"
	@echo "  make seed              - Seed PostGIS 3-Rings spatial geofences"
	@echo "  make download-gov-data - Download real US Gov datasets (TIGER, FBI, OpenSky, AIS, CBP, USGS)"
	@echo "  make oci-deploy-vm     - Deploy single-VM stack to OCI Ampere A1 (4 OCPU / 24GB RAM)"
	@echo "  make oci-deploy-oke    - Deploy microservices to Oracle Kubernetes Engine (OKE)"
	@echo "  make test              - Run Pytest test suite"
	@echo "  make docker-up         - Spin up PostGIS, Redpanda, Qdrant, Redis containers"
	@echo "  make docker-down       - Teardown Docker Compose services"

dev:
	uv run python -m uvicorn services.c2_gateway.main:app --host 0.0.0.0 --port 8000 --reload

simulate:
	./scripts/run_simulation_c2.sh

joint-sim:
	uv run python scripts/simulate_joint_operation.py

seed:
	uv run python infra/scripts/seed_geofences.py

download-gov-data:
	uv run python infra/scripts/download_real_gov_datasets.py

test:
	uv run pytest -q --tb=short

oci-deploy-vm:
	TARGET_MODE=vm ./infra/scripts/deploy_oci.sh

oci-deploy-oke:
	TARGET_MODE=oke ./infra/scripts/deploy_oci.sh

docker-up:
	docker compose up -d

docker-down:
	docker compose down

