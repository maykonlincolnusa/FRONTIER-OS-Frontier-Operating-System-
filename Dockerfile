# Multi-stage Dockerfile optimized for Project Frontier (FRONTIER-C4ISR)
# Configured for Deep Learning + PyTorch Multiprocessing with IPC shared memory support

# Stage 1: Build Dependencies
FROM python:3.12-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    libpq-dev \
    libgeos-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv for ultra-fast dependency resolution
COPY --from=ghcr.io/astral-sh/uv:0.5.24 /uv /bin/uv

COPY pyproject.toml ./
RUN uv venv /opt/venv && \
    . /opt/venv/bin/activate && \
    uv pip install --no-cache -r pyproject.toml

# Stage 2: Production Runtime
FROM python:3.12-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libgeos-c1v5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy pre-built virtual environment
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONPATH="/app" \
    PYTHONUNBUFFERED=1 \
    # Prevent CPU core thrashing across workers; parallelism governed by ProcessPoolExecutor
    OMP_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    OPENBLAS_NUM_THREADS=1 \
    VECLIB_MAXIMUM_THREADS=1 \
    NUMEXPR_NUM_THREADS=1

# Copy application source
COPY . /app

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "services.c2-gateway.main:app", "--host", "0.0.0.0", "--port", "8000"]

