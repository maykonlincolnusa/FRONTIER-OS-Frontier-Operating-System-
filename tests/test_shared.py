"""
Project Frontier - Shared Package Unit Tests
Tests schemas, serialization, and geo utilities
"""

import pytest
from uuid import UUID
from datetime import datetime
from pydantic import ValidationError

from shared.events import (
    Agency,
    EntityTelemetryEvent,
    JurisdictionHandoffEvent,
    KafkaTopic,
    SecurityRing,
    TargetType,
    ThreatAlertEvent,
)
from shared.geo import (
    classify_fast_security_ring,
    haversine_distance_meters,
    haversine_distance_nautical_miles,
    initial_bearing_deg,
    point_in_polygon,
    validate_coordinates,
)
from shared.config import get_settings


def test_threat_alert_event_serialization():
    """Verify ThreatAlertEvent creates valid event and serializes to/from Kafka bytes."""
    event = ThreatAlertEvent(
        subsystem="01-maritime-coastline",
        ring=SecurityRing.RING_1_MARITIME,
        lead_agency=Agency.USCG,
        severity=0.85,
        latitude=27.5,
        longitude=-95.0,
        target_id="VESSEL-DARK-4091",
        threat_type="AIS_DARK_SHIP",
        metadata={"speed_knots": 14.2, "anomaly_score": 0.91},
    )

    assert isinstance(event.event_id, UUID)
    assert isinstance(event.timestamp, datetime)
    assert event.severity == 0.85
    assert event.ring == SecurityRing.RING_1_MARITIME

    # Kafka serialization test
    raw_bytes = event.to_kafka_bytes()
    assert isinstance(raw_bytes, bytes)

    deserialized = ThreatAlertEvent.from_kafka_bytes(raw_bytes)
    assert deserialized.target_id == "VESSEL-DARK-4091"
    assert deserialized.severity == 0.85
    assert deserialized.ring == SecurityRing.RING_1_MARITIME
    assert deserialized.lead_agency == Agency.USCG


def test_threat_alert_severity_validation():
    """Ensure severity outside [0.0, 1.0] raises a ValidationError."""
    with pytest.raises(ValidationError):
        ThreatAlertEvent(
            subsystem="02-airspace-shield",
            ring=SecurityRing.RING_2_FEDERAL,
            lead_agency=Agency.USAF,
            severity=1.5,  # Invalid: > 1.0
            latitude=31.2,
            longitude=-106.5,
            target_id="AIR-UNKNOWN-99",
            threat_type="LOW_ALT_RADAR_EVASION",
        )


def test_jurisdiction_handoff_event():
    """Verify JurisdictionHandoffEvent creation and Kafka wire format."""
    handoff = JurisdictionHandoffEvent(
        target_id="VESSEL-NARCO-77",
        from_ring=SecurityRing.RING_1_MARITIME,
        to_ring=SecurityRing.RING_2_FEDERAL,
        from_agency=Agency.USCG,
        to_agency=Agency.CBP,
        last_known_lat=26.05,
        last_known_lon=-97.15,
        reason="Target landed on South Padre Island beach outside official port of entry.",
    )

    assert isinstance(handoff.handoff_id, UUID)
    assert handoff.from_ring == SecurityRing.RING_1_MARITIME
    assert handoff.to_ring == SecurityRing.RING_2_FEDERAL
    assert handoff.to_agency == Agency.CBP

    kafka_bytes = handoff.to_kafka_bytes()
    restored = JurisdictionHandoffEvent.from_kafka_bytes(kafka_bytes)
    assert restored.target_id == "VESSEL-NARCO-77"
    assert restored.to_agency == Agency.CBP


def test_geo_haversine_and_bearing():
    """Test haversine calculations and bearing logic."""
    # San Diego (32.7157, -117.1611) to Tijuana (32.5149, -117.0382)
    dist_m = haversine_distance_meters(32.7157, -117.1611, 32.5149, -117.0382)
    assert 20000 < dist_m < 30000  # Approx 25 km

    dist_nm = haversine_distance_nautical_miles(32.7157, -117.1611, 32.5149, -117.0382)
    assert 10 < dist_nm < 16

    bearing = initial_bearing_deg(32.7157, -117.1611, 32.5149, -117.0382)
    assert 130 < bearing < 170  # Southeast-ish


def test_point_in_polygon():
    """Test simple ray casting point-in-polygon."""
    box = [(0.0, 0.0), (10.0, 0.0), (10.0, 10.0), (0.0, 10.0)]
    assert point_in_polygon(5.0, 5.0, box) is True
    assert point_in_polygon(15.0, 5.0, box) is False


def test_classify_fast_security_ring():
    """Test fast ring classification heuristics."""
    # US-Mexico border coordinate -> Ring 2
    ring, agency = classify_fast_security_ring(-106.48, 31.76)
    assert ring == SecurityRing.RING_2_FEDERAL

    # Deep Gulf of Mexico -> Ring 1
    ring, agency = classify_fast_security_ring(-90.0, 26.0)
    assert ring == SecurityRing.RING_1_MARITIME

    # Interior US (Kansas / Missouri) -> Ring 3
    ring, agency = classify_fast_security_ring(-94.5, 39.1)
    assert ring == SecurityRing.RING_3_INTERSTATE


def test_settings_load():
    """Test system settings defaults and URLs."""
    settings = get_settings()
    assert settings.POSTGRES_DB == "frontier_c4isr"
    assert "postgresql+asyncpg://" in settings.async_database_url
    assert "localhost:9092" in settings.KAFKA_BOOTSTRAP_SERVERS

