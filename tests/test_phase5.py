"""
Tests for Phase 5: Pan-American Transnational Expansion, System Elasticity & Tactical UX.
Verifies multi-theater schemas, H3 spatial sharding, Latam OSINT connectors,
and multiprocessing backpressure.
"""

import os
from pathlib import Path
import pytest

from shared.concurrency.mp_engine import InferenceProcessPool
from shared.connectors.latam_osint import (
    PANAMERICAN_CORRIDORS,
    PANAMERICAN_NODES,
    LatamOSINTConnector,
)
from shared.events.schemas import (
    Agency,
    InternationalCorridorHandoffEvent,
    SecurityRing,
    TheaterOfOperations,
    TransnationalSyndicate,
    TransportModal,
)
from shared.geo.h3_index import H3SpatialIndex


def test_phase5_panamerican_enums_and_schemas():
    """Verify all 7 theaters, syndicates, transport modals and expanded partner agencies."""
    # 7 Theaters
    theaters = {t.value for t in TheaterOfOperations}
    assert "BRAZIL" in theaters
    assert "COLOMBIA" in theaters
    assert "PANAMA" in theaters
    assert "MEXICO" in theaters
    assert "USA" in theaters
    assert "CHILE" in theaters
    assert "ARGENTINA" in theaters

    # Syndicates
    syndicates = {s.value for s in TransnationalSyndicate}
    assert "PCC" in syndicates
    assert "CV" in syndicates
    assert "SINALOA_CARTEL" in syndicates
    assert "CJNG" in syndicates
    assert "CLAN_DEL_GOLFO" in syndicates
    assert "TREN_DE_ARAGUA" in syndicates

    # Modals
    modals = {m.value for m in TransportModal}
    assert "MARITIME_CONTAINER" in modals
    assert "SEMI_SUBMERSIBLE" in modals
    assert "RIVERINE_BARGE" in modals
    assert "CLANDESTINE_AIRCRAFT" in modals
    assert "HIGHWAY_FREIGHT" in modals
    assert "PANAMA_CANAL_TRANSIT" in modals

    # Expanded Agencies
    agencies = {a.value for a in Agency}
    assert "PF_BR" in agencies
    assert "PRF_BR" in agencies
    assert "ANTAQ_BR" in agencies
    assert "MARINHA_BR" in agencies
    assert "FAB_BR" in agencies
    assert "ARMADA_CO" in agencies
    assert "ACP_PA" in agencies
    assert "DIRECTEMAR_CL" in agencies
    assert "PREFECTURA_AR" in agencies
    assert "INTERPOL" in agencies


def test_phase5_international_handoff_event():
    """Verify InternationalCorridorHandoffEvent contract."""
    event = InternationalCorridorHandoffEvent(
        target_id="CONTAINER-PCC-TEST",
        syndicate=TransnationalSyndicate.PCC,
        modal=TransportModal.MARITIME_CONTAINER,
        origin_theater=TheaterOfOperations.BRAZIL,
        destination_theater=TheaterOfOperations.USA,
        from_agency=Agency.PF_BR,
        to_agency=Agency.USCG,
        chokepoint="Porto de Santos",
        cargo_manifest={"declared": "Coffee", "illicit_est_kg": 400},
        risk_score=0.89,
        latitude=-23.967,
        longitude=-46.301,
        operational_summary="Target container flagged for rip-on rip-off tampering.",
    )
    assert event.target_id == "CONTAINER-PCC-TEST"
    assert event.syndicate == TransnationalSyndicate.PCC
    assert event.origin_theater == TheaterOfOperations.BRAZIL
    assert event.from_agency == Agency.PF_BR
    assert event.risk_score == 0.89


def test_phase5_h3_spatial_index():
    """Verify Uber H3 spatial sharding and fast O(1) checks."""
    idx = H3SpatialIndex.get_instance()
    stats = idx.get_index_stats()
    assert stats["status"] == "READY"
    assert stats["ring1_cells_count"] > 100
    assert stats["ring2_cells_count"] > 50
    assert stats["ring3_cells_count"] > 30

    # Laredo POE candidate check
    is_cand, ring = idx.fast_lookup_ring(27.599, -99.531)
    assert is_cand is True
    assert ring == SecurityRing.RING_2_FEDERAL

    # Panama canal chokepoint check
    is_choke = idx.is_panamerican_chokepoint(8.956, -79.567)
    assert is_choke is True


def test_phase5_latam_osint_connector():
    """Verify Latin American OSINT connector and node federation."""
    connector = LatamOSINTConnector.get_instance()
    assert len(connector.nodes) >= 16
    assert len(connector.corridors) >= 4

    br_nodes = connector.get_nodes_by_theater(TheaterOfOperations.BRAZIL)
    assert len(br_nodes) >= 4
    br_ids = [n["id"] for n in br_nodes]
    assert "BR-PORT-SANTOS" in br_ids
    assert "BR-AMAZON-TABATINGA" in br_ids

    sampled = connector.sample_live_osint_events(count=3)
    assert len(sampled) == 3
    assert all(isinstance(e, InternationalCorridorHandoffEvent) for e in sampled)


def test_phase5_mp_engine_backpressure_and_batching():
    """Verify adaptive backpressure and telemetry in InferenceProcessPool."""
    pool = InferenceProcessPool.get_instance()
    telemetry = pool.get_pool_telemetry()
    assert "active_tasks" in telemetry
    assert "max_queue_depth" in telemetry
    assert "backpressure_active" in telemetry
    assert telemetry["backpressure_active"] is False


def test_phase5_keda_autoscaling_manifest():
    """Verify KEDA ScaledObject manifest exists and specifies 1 to 10 replicas."""
    keda_file = Path(__file__).resolve().parent.parent / "infra" / "keda" / "kafka-scaledobject.yaml"
    assert keda_file.exists(), "KEDA ScaledObject manifest missing"
    content = keda_file.read_text()
    assert "minReplicaCount: 1" in content
    assert "maxReplicaCount: 10" in content
    assert "maritime-coastline-scaler" in content
    assert "narcotics-intel-scaler" in content
    assert "c4isr-fusion-scaler" in content
    assert "raw.ais.positions" in content
    assert "intel.narcotics.hotspots" in content
