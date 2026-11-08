#!/usr/bin/env bash
# ==============================================================================
# Project Frontier (FRONTIER-C4ISR) - Automated OCI Deployment Engine
# Deploys Multi-Arch Arm64/Amd64 stacks to Oracle Cloud Infrastructure:
# - Mode A: Oracle Container Engine for Kubernetes (OKE)
# - Mode B: OCI Compute VM Ampere A1 (4 OCPU / 24GB RAM Always Free)
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Default Configuration
TARGET_MODE="${TARGET_MODE:-oke}" # "oke" or "vm"
OCI_REGION="${OCI_REGION:-us-ashburn-1}"
OCI_TENANCY="${OCI_TENANCY:-}"
OCIR_REPO="${OCIR_REPO:-frontier-c4isr}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
BUILD_PLATFORMS="${BUILD_PLATFORMS:-linux/arm64}" # Default to Arm64 Ampere

# Color helpers
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}================================================================================"
echo -e " PROJECT FRONTIER (FRONTIER-C4ISR) - ORACLE CLOUD (OCI) DEPLOYMENT ENGINE"
echo -e " Target: [${TARGET_MODE^^}] | Architecture: [${BUILD_PLATFORMS}] | Region: [${OCI_REGION}]"
echo -e "================================================================================${NC}"

cd "${ROOT_DIR}"

# 1. Validate Prerequisite Tools
echo -e "\n${YELLOW}[1/4] Checking environment & CLI dependencies...${NC}"
command -v docker >/dev/null 2>&1 || { echo -e "${RED}Error: Docker is not installed.${NC}"; exit 1; }

if [ "${TARGET_MODE}" = "oke" ]; then
    command -v kubectl >/dev/null 2>&1 || { echo -e "${RED}Error: kubectl is required for OKE deployment.${NC}"; exit 1; }
fi

# 2. Setup Multi-Architecture Docker Buildx
echo -e "\n${YELLOW}[2/4] Setting up Docker Buildx for Multi-Arch ARM64/AMD64 compilation...${NC}"
if ! docker buildx inspect frontier-builder >/dev/null 2>&1; then
    docker buildx create --name frontier-builder --driver docker-container --use
else
    docker buildx use frontier-builder
fi
docker buildx inspect --bootstrap

# 3. Build & Package Container Images
echo -e "\n${YELLOW}[3/4] Building Multi-Arch container images (${BUILD_PLATFORMS})...${NC}"

GATEWAY_IMG="frontier-c4isr/gateway:${IMAGE_TAG}"
DASHBOARD_IMG="frontier-c4isr/dashboard:${IMAGE_TAG}"

if [ -n "${OCI_TENANCY}" ]; then
    # Full Oracle Cloud Infrastructure Registry (OCIR) URL format
    OCIR_HOST="${OCI_REGION}.ocir.io"
    GATEWAY_IMG="${OCIR_HOST}/${OCI_TENANCY}/${OCIR_REPO}/gateway:${IMAGE_TAG}"
    DASHBOARD_IMG="${OCIR_HOST}/${OCI_TENANCY}/${OCIR_REPO}/dashboard:${IMAGE_TAG}"
    echo -e "Target OCIR Registry: ${CYAN}${OCIR_HOST}/${OCI_TENANCY}/${OCIR_REPO}${NC}"
fi

echo -e "Building C4ISR Backend Gateway & Deep Learning Workers -> ${GATEWAY_IMG}"
docker buildx build \
    --platform "${BUILD_PLATFORMS}" \
    -t "${GATEWAY_IMG}" \
    -f Dockerfile \
    --load \
    .

echo -e "Building C4ISR Next.js Tactical Dashboard -> ${DASHBOARD_IMG}"
docker buildx build \
    --platform "${BUILD_PLATFORMS}" \
    -t "${DASHBOARD_IMG}" \
    -f dashboard-c2/Dockerfile \
    --load \
    dashboard-c2/

# If pushing to OCIR
if [ -n "${OCI_TENANCY}" ] && [ "${PUSH_IMAGES:-false}" = "true" ]; then
    echo -e "Pushing images to Oracle Cloud Infrastructure Registry (OCIR)..."
    docker push "${GATEWAY_IMG}"
    docker push "${DASHBOARD_IMG}"
fi

# 4. Deploy to Chosen Target Infrastructure
echo -e "\n${YELLOW}[4/4] Executing deployment on [${TARGET_MODE^^}]...${NC}"

if [ "${TARGET_MODE}" = "oke" ]; then
    echo -e "Applying Kubernetes manifests to Oracle Container Engine for Kubernetes (OKE)..."
    
    kubectl apply -f infra/oci-oke/namespace.yaml
    kubectl apply -f infra/oci-oke/statefulsets-data.yaml
    kubectl apply -f infra/oci-oke/deployments-services.yaml
    kubectl apply -f infra/oci-oke/ingress-oci.yaml
    
    echo -e "\n${GREEN}Manifests applied successfully!${NC}"
    echo -e "Checking pods in namespace 'frontier-c4isr':"
    kubectl get pods -n frontier-c4isr -o wide || true

    echo -e "\n${CYAN}To view your OCI Flexible Load Balancer external IP:${NC}"
    echo -e "  kubectl get svc -n frontier-c4isr -l app=frontier-c4isr-lb"

elif [ "${TARGET_MODE}" = "vm" ]; then
    echo -e "Deploying single-VM OCI Ampere A1 compose stack..."
    docker compose -f infra/oci-oke/docker-compose.oci-ampere.yml up -d
    
    echo -e "Waiting for PostGIS to accept connections..."
    sleep 5
    
    echo -e "Seeding PostGIS 3-Rings Geofences..."
    uv run python infra/scripts/seed_geofences.py || true
    
    echo -e "\n${GREEN}OCI Ampere A1 stack deployed successfully!${NC}"
    echo -e "Access the Tactical Dashboard at: ${CYAN}http://<YOUR_OCI_VM_PUBLIC_IP>:3000${NC}"
    echo -e "Access C2 Gateway API at:         ${CYAN}http://<YOUR_OCI_VM_PUBLIC_IP>:8000${NC}"
    echo -e "Access Redpanda Console at:       ${CYAN}http://<YOUR_OCI_VM_PUBLIC_IP>:8080${NC}"
fi

echo -e "\n${GREEN}Deployment process completed.${NC}\n"

