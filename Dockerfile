# syntax=docker/dockerfile:1.4
# ==============================================================================
# Project Frontier (FRONTIER-C4ISR) - Multi-Architecture Production Dockerfile
# Optimized for Oracle Cloud Infrastructure (OCI) Ampere A1 (linux/arm64) and x86_64 (linux/amd64)
# Features native NEON SIMD vector acceleration for PyTorch & ONNX Runtime
# ==============================================================================

ARG PYTHON_VERSION=3.12-slim
FROM python:${PYTHON_VERSION} AS builder

ARG TARGETPLATFORM
ARG BUILDPLATFORM

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    libpq-dev \
    libgeos-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install architecture-aware uv binary
COPY --from=ghcr.io/astral-sh/uv:0.5.24 /uv /bin/uv

COPY pyproject.toml ./
# Install dependencies with platform-native wheels (aarch64 NEON or x86_64 AVX2)
RUN uv venv /opt/venv && \
    . /opt/venv/bin/activate && \
    uv pip install --no-cache -r pyproject.toml

# ==============================================================================
# Stage 2: Minimalist Multi-Arch Runtime
# ==============================================================================
FROM python:${PYTHON_VERSION} AS runtime

ARG TARGETPLATFORM
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libgeos-c1v5 \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/venv /opt/venv

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONPATH="/app" \
    PYTHONUNBUFFERED=1 \
    # Thread governance: prevents OCI Ampere A1 CPU core thrashing across InferenceProcessPool workers
    OMP_NUM_THREADS=1 \
    OPENBLAS_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    VECLIB_MAXIMUM_THREADS=1 \
    NUMEXPR_NUM_THREADS=1 \
    # Shared memory allocation hint for torch.multiprocessing
    TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD=0

COPY . /app

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "services.c2_gateway.main:app", "--host", "0.0.0.0", "--port", "8000"]
