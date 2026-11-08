#!/usr/bin/env bash
# ==============================================================================
# Project Frontier (FRONTIER-OS) - Google Cloud Automated Deployment Engine
# Deploys to:
# - Mode A: Google Cloud Run (Serverless Gateway + Dashboard)
# - Mode B: Google Kubernetes Engine (GKE Autopilot)
# Integrates:
# - Google Artifact Registry (Docker images)
# - Google Cloud Storage (ONNX weights bucket)
# - Google Cloud SQL (pgvector + PostGIS)
# - Google BigQuery (Audit & Telemetry Dataset)
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

GCP_PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || echo '')}"
GCP_REGION="${GCP_REGION:-us-central1}"
GCS_BUCKET="${GCS_BUCKET:-frontier-c4isr-weights}"
ARTIFACT_REPO="${ARTIFACT_REPO:-frontier-c4isr}"
TARGET_MODE="${TARGET_MODE:-cloudrun}" # cloudrun | gke
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo -e "${CYAN}========================================================================${NC}"
echo -e "${GREEN} PROJECT FRONTIER (FRONTIER-OS) - GOOGLE CLOUD DEPLOYMENT ENGINE${NC}"
echo -e "${CYAN} Target: [${TARGET_MODE^^}] | Project: [${GCP_PROJECT_ID}] | Region: [${GCP_REGION}]${NC}"
echo -e "${CYAN}========================================================================${NC}"

if [ -z "${GCP_PROJECT_ID}" ]; then
    echo -e "${RED}[ERROR] GCP_PROJECT_ID is not set. Run 'gcloud config set project <ID>' or export GCP_PROJECT_ID.${NC}"
    exit 1
fi

# 1. Enable required Google Cloud APIs
echo -e "\n${YELLOW}[1/5] Enabling Google Cloud Services APIs...${NC}"
gcloud services enable \
    run.googleapis.com \
    container.googleapis.com \
    artifactregistry.googleapis.com \
    storage.googleapis.com \
    sqladmin.googleapis.com \
    bigquery.googleapis.com \
    aiplatform.googleapis.com \
    --project="${GCP_PROJECT_ID}" || true

# 2. Ensure Google Cloud Storage Bucket for Weights
echo -e "\n${YELLOW}[2/5] Ensuring GCS Bucket gs://${GCS_BUCKET}...${NC}"
if ! gcloud storage buckets describe "gs://${GCS_BUCKET}" --project="${GCP_PROJECT_ID}" &>/dev/null; then
    gcloud storage buckets create "gs://${GCS_BUCKET}" --location="${GCP_REGION}" --project="${GCP_PROJECT_ID}" || true
fi

# Upload ONNX weights if local exists
if [ -d "frontier_c4isr_deployment/weights" ]; then
    echo -e "Syncing ONNX model weights to gs://${GCS_BUCKET}/weights/..."
    gcloud storage rsync frontier_c4isr_deployment/weights "gs://${GCS_BUCKET}/weights" || true
fi

# 3. Ensure Artifact Registry Repository
echo -e "\n${YELLOW}[3/5] Ensuring Artifact Registry repository '${ARTIFACT_REPO}'...${NC}"
gcloud artifacts repositories create "${ARTIFACT_REPO}" \
    --repository-format=docker \
    --location="${GCP_REGION}" \
    --description="FRONTIER-OS C4ISR Docker Container Repository" \
    --project="${GCP_PROJECT_ID}" 2>/dev/null || true

REGISTRY_URL="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${ARTIFACT_REPO}"

# Configure docker auth
gcloud auth configure-docker "${GCP_REGION}-docker.pkg.dev" --quiet

# 4. Build and Push Container Images
echo -e "\n${YELLOW}[4/5] Building & Pushing Containers to Artifact Registry...${NC}"
GATEWAY_IMG="${REGISTRY_URL}/gateway:${IMAGE_TAG}"
DASHBOARD_IMG="${REGISTRY_URL}/dashboard:${IMAGE_TAG}"

docker build -t "${GATEWAY_IMG}" -f Dockerfile .
docker push "${GATEWAY_IMG}"

docker build -t "${DASHBOARD_IMG}" -f dashboard-c2/Dockerfile dashboard-c2
docker push "${DASHBOARD_IMG}"

# 5. Deploy Target (Cloud Run vs GKE)
echo -e "\n${YELLOW}[5/5] Deploying workloads to [${TARGET_MODE^^}]...${NC}"
if [ "${TARGET_MODE}" = "cloudrun" ]; then
    echo -e "Deploying C2 Gateway to Google Cloud Run..."
    gcloud run deploy frontier-c2-gateway \
        --image="${GATEWAY_IMG}" \
        --platform=managed \
        --region="${GCP_REGION}" \
        --project="${GCP_PROJECT_ID}" \
        --allow-unauthenticated \
        --cpu=2 \
        --memory=4Gi \
        --set-env-vars="GCP_PROJECT_ID=${GCP_PROJECT_ID},GCP_REGION=${GCP_REGION},GCS_WEIGHTS_BUCKET=${GCS_BUCKET}"

    GATEWAY_URL=$(gcloud run services describe frontier-c2-gateway --region="${GCP_REGION}" --project="${GCP_PROJECT_ID}" --format="value(status.url)")

    echo -e "Deploying Tactical Dashboard to Google Cloud Run..."
    gcloud run deploy frontier-c2-dashboard \
        --image="${DASHBOARD_IMG}" \
        --platform=managed \
        --region="${GCP_REGION}" \
        --project="${GCP_PROJECT_ID}" \
        --allow-unauthenticated \
        --cpu=2 \
        --memory=2Gi \
        --set-env-vars="NEXT_PUBLIC_GATEWAY_URL=${GATEWAY_URL}"

    DASHBOARD_URL=$(gcloud run services describe frontier-c2-dashboard --region="${GCP_REGION}" --project="${GCP_PROJECT_ID}" --format="value(status.url)")

    echo -e "\n${GREEN}========================================================================${NC}"
    echo -e "${GREEN} FRONTIER-OS DEPLOYED ON GOOGLE CLOUD RUN!${NC}"
    echo -e " Tactical Dashboard: ${CYAN}${DASHBOARD_URL}${NC}"
    echo -e " C2 Gateway API:     ${CYAN}${GATEWAY_URL}${NC}"
    echo -e "${GREEN}========================================================================${NC}"
else
    echo -e "Deploying to Google Kubernetes Engine (GKE Autopilot)..."
    kubectl apply -f infra/gcp/namespace.yaml
    export PROJECT_ID="${GCP_PROJECT_ID}"
    export REGION="${GCP_REGION}"
    envsubst < infra/gcp/gke-autopilot-deployments.yaml | kubectl apply -f -
    kubectl apply -f infra/gcp/ingress-gcp.yaml
    echo -e "${GREEN}GKE Autopilot manifests applied! Check: kubectl get pods -n frontier-c4isr${NC}"
fi
