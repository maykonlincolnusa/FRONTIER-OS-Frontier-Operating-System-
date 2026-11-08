"""
Project Frontier - Event Schemas (Pydantic v2)
Single Source of Truth for Kafka / Redpanda Event Bus Contracts
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional
from uuid import UUID, uuid4
import json

from pydantic import BaseModel, ConfigDict, Field


class SecurityRing(str, Enum):
    """The 3 Defense-in-Depth Security Rings."""
    RING_1_MARITIME = "RING_1_MARITIME"
    RING_2_FEDERAL = "RING_2_FEDERAL"
    RING_3_INTERSTATE = "RING_3_INTERSTATE"


class TheaterOfOperations(str, Enum):
    """Federated Pan-American Theaters of Operations."""
    USA = "USA"
    BRAZIL = "BRAZIL"
    COLOMBIA = "COLOMBIA"
    MEXICO = "MEXICO"
    PANAMA = "PANAMA"
    CHILE = "CHILE"
    ARGENTINA = "ARGENTINA"


class TransnationalSyndicate(str, Enum):
    """Major Transnational Criminal Organizations (TCOs) and Drug Cartels."""
    PCC = "PCC"  # Primeiro Comando da Capital (Santos, Hidrovia Paraná-Paraguai)
    CV = "CV"    # Comando Vermelho (Rota Solimões / Amazônia)
    SINALOA_CARTEL = "SINALOA_CARTEL"
    CJNG = "CJNG"  # Cártel Jalisco Nueva Generación
    CLAN_DEL_GOLFO = "CLAN_DEL_GOLFO"
    TREN_DE_ARAGUA = "TREN_DE_ARAGUA"
    UNKNOWN = "UNKNOWN"


class TransportModal(str, Enum):
    """Multimodal Illicit Logistics and Conveyance."""
    MARITIME_CONTAINER = "MARITIME_CONTAINER"
    SEMI_SUBMERSIBLE = "SEMI_SUBMERSIBLE"
    RIVERINE_BARGE = "RIVERINE_BARGE"
    CLANDESTINE_AIRCRAFT = "CLANDESTINE_AIRCRAFT"
    HIGHWAY_FREIGHT = "HIGHWAY_FREIGHT"
    PANAMA_CANAL_TRANSIT = "PANAMA_CANAL_TRANSIT"


class Agency(str, Enum):
    """Participating Pan-American C4ISR Defense & Law Enforcement Agencies."""
    # United States Agencies
    USCG = "USCG"
    US_NAVY = "US_NAVY"
    USAF = "USAF"
    US_ARMY = "US_ARMY"
    CBP = "CBP"
    DEA = "DEA"
    FBI = "FBI"
    USDOT = "USDOT"
    STATE_TROOPERS = "STATE_TROOPERS"
    # Latin American Partner Agencies
    PF_BR = "PF_BR"                      # Polícia Federal (Brasil)
    PRF_BR = "PRF_BR"                    # Polícia Rodoviária Federal (Brasil)
    ANTAQ_BR = "ANTAQ_BR"                # Agência Nac. de Transportes Aquaviários (Brasil)
    MARINHA_BR = "MARINHA_BR"            # Marinha do Brasil
    FAB_BR = "FAB_BR"                    # Força Aérea Brasileira
    ARMADA_CO = "ARMADA_CO"              # Armada Nacional de Colombia
    ACP_PA = "ACP_PA"                    # Autoridad del Canal de Panamá
    DIRECTEMAR_CL = "DIRECTEMAR_CL"      # Dir. Gen. del Territorio Marítimo (Chile)
    PREFECTURA_AR = "PREFECTURA_AR"      # Prefectura Naval Argentina
    INTERPOL = "INTERPOL"                # International Criminal Police Organization


class TargetType(str, Enum):
    """Tracked Entity Classification."""
    VESSEL = "VESSEL"
    AIRCRAFT = "AIRCRAFT"
    VEHICLE = "VEHICLE"
    PERSON = "PERSON"
    UNKNOWN = "UNKNOWN"


class KafkaTopic(str, Enum):
    """Standardized Kafka / Redpanda Topic Registry."""
    RAW_AIS_POSITIONS = "raw.ais.positions"
    RAW_ADSB_STATES = "raw.adsb.states"
    ALERTS_MARITIME = "alerts.maritime"
    ALERTS_AIRSPACE = "alerts.airspace"
    INTEL_NARCOTICS_HOTSPOTS = "intel.narcotics.hotspots"
    ALERTS_CRIMINAL_SIGHTING = "alerts.criminal.sighting"
    EVENTS_JURISDICTION_HANDOFF = "events.jurisdiction.handoff"
    EVENTS_INTERNATIONAL_HANDOFF = "events.international.handoff"
    TELEMETRY_TRACKED_ENTITIES = "telemetry.tracked.entities"


def utc_now() -> datetime:
    """Return timezone-aware current UTC datetime."""
    return datetime.now(timezone.utc)


class FrontierBaseEvent(BaseModel):
    """Base event model with JSON and Kafka serialization utilities."""
    model_config = ConfigDict(
        use_enum_values=True,
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )

    def to_kafka_bytes(self) -> bytes:
        """Serialize event to UTF-8 encoded JSON bytes for Kafka publishing."""
        return self.model_dump_json().encode("utf-8")

    @classmethod
    def from_kafka_bytes(cls, data: bytes | str):
        """Deserialize event from raw Kafka bytes or JSON string."""
        if isinstance(data, bytes):
            data = data.decode("utf-8")
        return cls.model_validate_json(data)


class ThreatAlertEvent(FrontierBaseEvent):
    """
    Emitted by Deep Learning subsystems when an anomaly, illicit flight,
    narcotics hotspot, or criminal sighting is detected.
    """
    event_id: UUID = Field(default_factory=uuid4, description="Unique event identifier")
    timestamp: datetime = Field(default_factory=utc_now, description="UTC timestamp of the detection")
    subsystem: str = Field(..., description="Subsystem emitting alert, e.g. 01-maritime-coastline")
    ring: SecurityRing = Field(..., description="Security ring where detection occurred")
    lead_agency: Agency = Field(..., description="Agency with jurisdictional primacy")
    severity: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Risk score calculated by Deep Learning model (0.0 to 1.0)",
    )
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees (WGS84)")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees (WGS84)")
    target_id: str = Field(..., description="Unique entity/target tracking ID")
    threat_type: str = Field(..., description="Classification: AIS_DARK_SHIP, LOW_ALT_FLIGHT, FUGITIVE_MATCH, etc.")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Arbitrary subsystem-specific metadata")


class JurisdictionHandoffEvent(FrontierBaseEvent):
    """
    Emitted when a tracked target breaches a geofence and crosses between
    the 3 Security Rings, transferring primary jurisdiction between agencies.
    """
    handoff_id: UUID = Field(default_factory=uuid4, description="Unique handoff identifier")
    timestamp: datetime = Field(default_factory=utc_now, description="UTC timestamp of the transition")
    target_id: str = Field(..., description="Unique entity/target tracking ID")
    from_ring: SecurityRing = Field(..., description="Source security ring")
    to_ring: SecurityRing = Field(..., description="Destination security ring")
    from_agency: Agency = Field(..., description="Handing-off agency")
    to_agency: Agency = Field(..., description="Receiving agency assuming tactical command")
    last_known_lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude at crossing point")
    last_known_lon: float = Field(..., ge=-180.0, le=180.0, description="Longitude at crossing point")
    reason: str = Field(..., description="Operational reason for handoff")


class InternationalCorridorHandoffEvent(FrontierBaseEvent):
    """
    Emitted when suspicious cargo, vessel, aircraft, or syndicate entity crosses
    between Pan-American Theaters of Operations (e.g. Brazil -> Panama -> Mexico -> USA).
    """
    handoff_id: UUID = Field(default_factory=uuid4, description="Unique international handoff ID")
    timestamp: datetime = Field(default_factory=utc_now, description="UTC timestamp")
    target_id: str = Field(..., description="Tracking identifier (container, MMSI, flight, individual)")
    syndicate: TransnationalSyndicate = Field(default=TransnationalSyndicate.UNKNOWN, description="Attributed criminal faction")
    modal: TransportModal = Field(default=TransportModal.MARITIME_CONTAINER, description="Conveyance / Transport Modal")
    origin_theater: TheaterOfOperations = Field(..., description="Departure / Origin nation")
    destination_theater: TheaterOfOperations = Field(..., description="Destination nation")
    from_agency: Agency = Field(..., description="Handing-off partner agency")
    to_agency: Agency = Field(..., description="Receiving agency assuming tactical oversight")
    chokepoint: str = Field(..., description="Critical hub/port/strait, e.g. Port of Santos, Panama Canal, Laredo POE")
    cargo_manifest: dict[str, Any] = Field(default_factory=dict, description="B/L, declared contents, weight")
    risk_score: float = Field(..., ge=0.0, le=1.0, description="ST-GNN or heuristic risk score")
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    operational_summary: str = Field(..., description="Actionable intelligence summary for interdiction")


class EntityTelemetryEvent(FrontierBaseEvent):
    """
    Real-time spatio-temporal position report for an entity (vessel, aircraft, vehicle).
    """
    telemetry_id: UUID = Field(default_factory=uuid4)
    timestamp: datetime = Field(default_factory=utc_now)
    target_id: str
    target_type: TargetType
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    altitude_feet: Optional[float] = None
    speed_knots: Optional[float] = None
    heading_deg: Optional[float] = Field(None, ge=0.0, le=360.0)
    current_ring: Optional[SecurityRing] = None
    lead_agency: Optional[Agency] = None
    raw_payload: dict[str, Any] = Field(default_factory=dict)

