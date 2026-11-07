"""
Project Frontier - Concurrency & Geofence Unit Tests
Tests InferenceProcessPool and JurisdictionLockManager
"""

import pytest
import asyncio
from shared.concurrency.distributed_lock import JurisdictionLockManager
from shared.concurrency.mp_engine import InferenceProcessPool
from shared.geo.geofence_engine import GeofenceEngine
from shared.events.schemas import TargetType


@pytest.mark.asyncio
async def test_distributed_lock_mutual_exclusion():
    """Verify lock manager enforces mutual exclusion for identical target_id."""
    lock_mgr = JurisdictionLockManager()
    target_id = "TEST-TARGET-999"

    async with lock_mgr.acquire(target_id, ttl_seconds=2) as acq1:
        assert acq1 is True
        # Concurrent second acquire on the same key must fail
        async with lock_mgr.acquire(target_id, ttl_seconds=2, acquire_timeout=0.05) as acq2:
            assert acq2 is False

    # After context exit, lock should be released
    async with lock_mgr.acquire(target_id, ttl_seconds=2, acquire_timeout=0.05) as acq3:
        assert acq3 is True

    await lock_mgr.close()


@pytest.mark.asyncio
async def test_mp_inference_pool():
    """Verify PyTorch inference runs across spawned process pool with locks."""
    pool = InferenceProcessPool.get_instance(max_workers=2)

    # Test maritime sequence
    ais_features = [[0.1, -0.2, 0.4, 0.8, 0.05] for _ in range(5)]
    maritime_score = await pool.infer_maritime_anomaly(ais_features)
    assert 0.0 <= maritime_score <= 1.0

    # Test airspace vector
    flight_vector = [0.2, 0.5, 0.5, 0.2]
    flight_score = await pool.infer_flight_anomaly(flight_vector)
    assert 0.0 <= flight_score <= 1.0


@pytest.mark.asyncio
async def test_geofence_engine_local_processing():
    """Verify GeofenceEngine processes target coordinates cleanly without database."""
    engine = GeofenceEngine()
    triggered, event = await engine.process_target_position(
        target_id="TARGET-SIM-1",
        target_type=TargetType.VESSEL,
        longitude=-95.0,
        latitude=26.0,
        speed_knots=14.0,
    )
    # Under offline fallback without DB, handles without throwing exceptions
    assert isinstance(triggered, bool)
    await engine.close()
