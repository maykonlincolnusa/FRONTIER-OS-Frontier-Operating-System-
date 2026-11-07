"""
Project Frontier - Phase 4 Integration Tests
Tests ONNX Runtime inference, Dynamic Batching, and Multi-Agency Intelligence Fusion.
"""

import numpy as np
import pytest

from services.c2_gateway.fusion_engine import JointTaskForceIncident, MultiAgencyFusionEngine
from shared.concurrency.onnx_runner import LockedONNXSession
from shared.events.schemas import (
    Agency,
    JurisdictionHandoffEvent,
    SecurityRing,
    ThreatAlertEvent,
)


def test_locked_onnx_session_inference():
    """Verify LockedONNXSession loads model and runs dynamic batch inference."""
    sess = LockedONNXSession("ml-training/weights/airspace_ae.onnx")
    item1 = np.array([0.2, 0.4, 0.5, 0.2], dtype=np.float32)
    item2 = np.array([0.9, 0.8, 0.5, 0.9], dtype=np.float32)

    batched_out = sess.run_dynamic_batch("flight_state", [item1, item2])
    assert batched_out.shape == (2, 4)


def test_multi_agency_fusion_engine():
    """Verify fusion engine correlates cross-ring handoff into a JointTaskForceIncident."""
    engine = MultiAgencyFusionEngine(correlation_radius_meters=20000.0)

    # 1. Handoff event
    handoff = JurisdictionHandoffEvent(
        target_id="TARGET-BEACH-99",
        from_ring=SecurityRing.RING_1_MARITIME,
        to_ring=SecurityRing.RING_2_FEDERAL,
        from_agency=Agency.USCG,
        to_agency=Agency.CBP,
        last_known_lat=26.05,
        last_known_lon=-97.15,
        reason="Vessel beached outside port.",
    )
    jtf1 = engine.register_jurisdiction_handoff(handoff)
    assert jtf1 is not None
    assert "TARGET-BEACH-99" in jtf1.correlated_targets
    assert "USCG" in jtf1.primary_agencies
    assert "CBP" in jtf1.primary_agencies

    # 2. Correlated threat alert within 15 km
    alert = ThreatAlertEvent(
        subsystem="05-geospatial-recon",
        ring=SecurityRing.RING_2_FEDERAL,
        lead_agency=Agency.US_ARMY,
        severity=0.88,
        latitude=26.08,
        longitude=-97.18,
        target_id="CONVOY-01",
        threat_type="DESERT_VEHICLE_CONVOY",
    )
    jtf2 = engine.register_threat_alert(alert)
    assert jtf2 is not None
    assert "TARGET-BEACH-99" in jtf2.correlated_targets
    assert "CONVOY-01" in jtf2.correlated_targets
