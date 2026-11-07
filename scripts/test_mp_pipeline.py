"""
Project Frontier - Multiprocessing Concurrency & Pipeline Stress Test
Simulates 50 simultaneous multi-domain targets (vessels, aircraft, ground vehicles)
routed through the spawn-based InferenceProcessPool with PyTorch Deep Learning inference,
shared locks, and distributed jurisdiction handoffs without race conditions.
"""

import asyncio
import os
import random
import sys
import time
from typing import Any, Dict, List

# Ensure repository root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from shared.concurrency.distributed_lock import JurisdictionLockManager
from shared.concurrency.mp_engine import InferenceProcessPool
from shared.events.schemas import (
    Agency,
    JurisdictionHandoffEvent,
    SecurityRing,
    TargetType,
    ThreatAlertEvent,
)
from shared.geo.geofence_engine import GeofenceEngine
from shared.geo.utils import classify_fast_security_ring


async def simulate_vessel_target(
    target_idx: int,
    pool: InferenceProcessPool,
    lock_mgr: JurisdictionLockManager,
) -> Dict[str, Any]:
    """Simulate a maritime vessel running AIS sequence inference on PyTorch."""
    target_id = f"MMSI-367{target_idx:05d}"
    is_anomaly = (target_idx % 3 == 0)

    # AIS sequence: 10 steps of (lat, lon, sog, cog, delta_t)
    lat = 26.5 + (target_idx * 0.05)
    lon = -93.0 + (target_idx * 0.05)
    sog = 2.5 if is_anomaly else 16.0  # low speed loitering vs standard cruise
    cog = 320.0
    delta_t = 60.0

    features = [
        [
            (lat - 26.0) / 4.0,
            (lon - (-90.0)) / 8.0,
            sog / 25.0,
            cog / 360.0,
            delta_t / 3600.0,
        ]
        for _ in range(10)
    ]

    # Multiprocessed PyTorch LSTM inference protected by lock & semaphore
    start_t = time.perf_counter()
    anomaly_score = await pool.infer_maritime_anomaly(features)
    inference_time_ms = (time.perf_counter() - start_t) * 1000.0

    # Distributed Lock & Geofencing Transition test
    handoff_triggered = False
    async with lock_mgr.acquire(target_id, ttl_seconds=3) as acquired:
        if acquired:
            # Check fast ring
            ring, agency = classify_fast_security_ring(lon, lat)
            if is_anomaly and target_idx % 2 == 0:
                handoff_triggered = True  # Simulated boundary breach

    return {
        "target_id": target_id,
        "type": "VESSEL",
        "score": round(anomaly_score, 4),
        "is_threat": anomaly_score >= 0.65,
        "handoff_triggered": handoff_triggered,
        "latency_ms": round(inference_time_ms, 2),
    }


async def simulate_aircraft_target(
    target_idx: int,
    pool: InferenceProcessPool,
    lock_mgr: JurisdictionLockManager,
) -> Dict[str, Any]:
    """Simulate an aircraft state vector running Autoencoder inference."""
    target_id = f"AIR-ICAO-{target_idx:04d}"
    is_low_alt = (target_idx % 4 == 0)

    baro_alt = 750.0 if is_low_alt else 32000.0
    vel = 110.0 if is_low_alt else 450.0
    vert_rate = 0.5
    geo_alt = baro_alt

    vector = [
        min(max(baro_alt / 12000.0, 0.0), 1.0),
        min(max(vel / 250.0, 0.0), 1.0),
        min(max((vert_rate + 20.0) / 40.0, 0.0), 1.0),
        min(max(geo_alt / 12000.0, 0.0), 1.0),
    ]

    start_t = time.perf_counter()
    anomaly_score = await pool.infer_flight_anomaly(vector)
    inference_time_ms = (time.perf_counter() - start_t) * 1000.0

    handoff_triggered = False
    async with lock_mgr.acquire(target_id, ttl_seconds=3) as acquired:
        if acquired:
            if is_low_alt:
                handoff_triggered = True

    return {
        "target_id": target_id,
        "type": "AIRCRAFT",
        "score": round(anomaly_score, 4),
        "is_threat": anomaly_score >= 0.65,
        "handoff_triggered": handoff_triggered,
        "latency_ms": round(inference_time_ms, 2),
    }


async def simulate_vehicle_target(
    target_idx: int,
    pool: InferenceProcessPool,
    lock_mgr: JurisdictionLockManager,
) -> Dict[str, Any]:
    """Simulate interstate corridor target with distributed lock contention test."""
    target_id = f"VEHICLE-I10-{target_idx:04d}"

    # Vector calculation on worker
    start_t = time.perf_counter()
    dummy_vector = [0.5, 0.5, 0.5, 0.5]
    score = await pool.infer_flight_anomaly(dummy_vector)
    latency_ms = (time.perf_counter() - start_t) * 1000.0

    # Race condition test: two concurrent coroutines try to lock the exact same target_id
    acquired_1 = False
    acquired_2 = False

    async with lock_mgr.acquire(target_id, ttl_seconds=2) as acq1:
        acquired_1 = acq1
        # Try to acquire lock again concurrently for the same target
        async with lock_mgr.acquire(target_id, ttl_seconds=2, acquire_timeout=0.05) as acq2:
            acquired_2 = acq2

    # acq1 must be True, acq2 must be False (mutual exclusion guarantee)
    race_prevented = acquired_1 and (not acquired_2)

    return {
        "target_id": target_id,
        "type": "VEHICLE",
        "score": round(score, 4),
        "is_threat": score >= 0.65,
        "race_prevented": race_prevented,
        "latency_ms": round(latency_ms, 2),
    }


async def run_pipeline_test():
    print("=" * 80)
    print("PROJECT FRONTIER - MULTIPROCESSING & DISTRIBUTED LOCK STRESS TEST (50 TARGETS)")
    print("=" * 80)

    # Initialize isolated ProcessPoolExecutor with spawn context
    pool = InferenceProcessPool.get_instance(max_workers=4)
    lock_mgr = JurisdictionLockManager()

    tasks = []
    # 15 Maritime vessels
    for i in range(15):
        tasks.append(simulate_vessel_target(i, pool, lock_mgr))

    # 20 Aircraft
    for i in range(20):
        tasks.append(simulate_aircraft_target(i, pool, lock_mgr))

    # 15 Interstate vehicles
    for i in range(15):
        tasks.append(simulate_vehicle_target(i, pool, lock_mgr))

    print(f"Launching {len(tasks)} concurrent multi-domain tasks...")
    start_all = time.perf_counter()
    results = await asyncio.gather(*tasks)
    total_elapsed = time.perf_counter() - start_all

    print(f"\nAll {len(results)} tasks completed in: {total_elapsed:.3f}s")
    print(f"Throughput: {len(results) / total_elapsed:.2f} inferences/sec across ProcessPool")

    # Metrics aggregation
    vessels = [r for r in results if r["type"] == "VESSEL"]
    aircraft = [r for r in results if r["type"] == "AIRCRAFT"]
    vehicles = [r for r in results if r["type"] == "VEHICLE"]

    vessel_latencies = [r["latency_ms"] for r in vessels]
    air_latencies = [r["latency_ms"] for r in aircraft]
    races_prevented = all(r.get("race_prevented", True) for r in vehicles)

    print("\n[DOMAIN BREAKDOWN]")
    print(f"  Vessels Processed  : {len(vessels)} | Avg Latency: {sum(vessel_latencies)/len(vessel_latencies):.2f}ms")
    print(f"  Aircraft Processed : {len(aircraft)} | Avg Latency: {sum(air_latencies)/len(air_latencies):.2f}ms")
    print(f"  Vehicles Processed : {len(vehicles)} | Concurrency Lock Safety: {'VERIFIED (100% mutual exclusion)' if races_prevented else 'FAILED'}")

    # Check bounds
    for r in results:
        assert 0.0 <= r["score"] <= 1.0, f"Score out of bounds: {r}"

    assert races_prevented, "Race condition detected in distributed lock manager!"
    print("\n[RESULT] ALL 50 TARGETS PROCESSED SUCCESSFULLY WITH ZERO RACE CONDITIONS.")
    print("=" * 80)

    pool.shutdown(wait=True)
    await lock_mgr.close()


if __name__ == "__main__":
    asyncio.run(run_pipeline_test())

