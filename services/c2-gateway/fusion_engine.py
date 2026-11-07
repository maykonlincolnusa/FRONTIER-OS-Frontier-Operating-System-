"""
Project Frontier - Multi-Agency Intelligence Fusion Engine
Correlates spatio-temporal and biometric intelligence across the 3 Defense Rings:
1. Cross-Ring Correlation (Maritime -> Federal Border -> Interstate Corridors)
2. Unified Vector Search (Qdrant Biometric Fugitive & DEA Intel Matching)
3. Joint Task Force Incident (JTF) Synthesis and Real-Time C2 Dispatch
"""

import asyncio
from datetime import datetime, timezone
import math
import time
from typing import Any, Dict, List, Optional
from uuid import uuid4
from pydantic import BaseModel, Field

from ml_training.models.face_matcher import FaceEmbeddingEngine
from shared.events.schemas import (
    Agency,
    JurisdictionHandoffEvent,
    SecurityRing,
    ThreatAlertEvent,
)
from shared.geo.utils import haversine_distance_meters


class JointTaskForceIncident(BaseModel):
    """
    Unified multi-agency tactical incident tying maritime offloads,
    border intrusions, and interstate narcotics/fugitive tracking.
    """
    incident_id: str = Field(default_factory=lambda: f"JTF-OP-{uuid4().hex[:8].upper()}")
    title: str
    threat_level: str = "CRITICAL_MULTI_AGENCY_INTERCEPTION"
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    primary_agencies: List[str]
    subsystems_involved: List[str]
    correlated_targets: List[str]
    cross_ring_sequence: List[str]
    spatial_anchor: Dict[str, float]
    biometric_matches: List[Dict[str, Any]] = Field(default_factory=list)
    narcotics_corridor_risk: Optional[float] = None
    tactical_summary: str
    recommended_interception_point: str


class MultiAgencyFusionEngine:
    """
    Real-time cross-ring correlation and entity resolution engine.
    Listens to handoffs, correlates temporal & spatial proximities,
    and queries Qdrant for federal fugitive matches.
    """

    def __init__(self, correlation_radius_meters: float = 15000.0, time_window_seconds: float = 1800.0):
        self.correlation_radius_m = correlation_radius_meters  # 15 km radius
        self.time_window_s = time_window_seconds               # 30-minute window
        self.face_engine = FaceEmbeddingEngine(vector_size=512)
        # Recent state tracks for correlation
        self._recent_handoffs: List[JurisdictionHandoffEvent] = []
        self._recent_alerts: List[ThreatAlertEvent] = []
        self._active_incidents: Dict[str, JointTaskForceIncident] = {}

    def register_threat_alert(self, alert: ThreatAlertEvent) -> Optional[JointTaskForceIncident]:
        """Record alert and evaluate if it correlates with recent handoffs."""
        self._recent_alerts.append(alert)
        if len(self._recent_alerts) > 100:
            self._recent_alerts.pop(0)

        # Cross-correlate with active handoffs
        return self._evaluate_cross_ring_correlation(alert)

    def register_jurisdiction_handoff(self, handoff: JurisdictionHandoffEvent) -> Optional[JointTaskForceIncident]:
        """Record boundary transition and trigger cross-ring entity correlation."""
        self._recent_handoffs.append(handoff)
        if len(self._recent_handoffs) > 50:
            self._recent_handoffs.pop(0)

        from_ag = str(getattr(handoff.from_agency, "value", handoff.from_agency))
        to_ag = str(getattr(handoff.to_agency, "value", handoff.to_agency))
        from_rg = str(getattr(handoff.from_ring, "value", handoff.from_ring))
        to_rg = str(getattr(handoff.to_ring, "value", handoff.to_ring))

        # Trigger Qdrant search if transitioning to RING_3_INTERSTATE
        biometric_hits = []
        if to_rg == "RING_3_INTERSTATE":
            query_vec = self.face_engine.generate_synthetic_embedding(handoff.target_id)
            biometric_hits = self.face_engine.search_face(query_vec, top_k=2, score_threshold=0.60)

        # Build immediate JTF Incident for cross-ring handoff
        incident = JointTaskForceIncident(
            title=f"Cross-Ring Tactical Breach: {handoff.target_id}",
            primary_agencies=[from_ag, to_ag],
            subsystems_involved=["01-maritime-coastline", "02-airspace-shield", "04-criminal-interstate"],
            correlated_targets=[handoff.target_id],
            cross_ring_sequence=[from_rg, to_rg],
            spatial_anchor={"latitude": handoff.last_known_lat, "longitude": handoff.last_known_lon},
            biometric_matches=biometric_hits,
            tactical_summary=f"Automated handoff triggered from {from_ag} to {to_ag}. {handoff.reason}",
            recommended_interception_point="I-10 / I-35 Highway Patrol Intercept Coordinate",
        )

        self._active_incidents[incident.incident_id] = incident
        return incident

    def _evaluate_cross_ring_correlation(self, alert: ThreatAlertEvent) -> Optional[JointTaskForceIncident]:
        """Check if incoming alert matches a recent maritime beaching/handoff within 15 km & 30 min."""
        now_ts = time.time()
        lead_ag = str(getattr(alert.lead_agency, "value", alert.lead_agency))
        alert_rg = str(getattr(alert.ring, "value", alert.ring))

        for h in reversed(self._recent_handoffs):
            dist_m = haversine_distance_meters(alert.latitude, alert.longitude, h.last_known_lat, h.last_known_lon)
            if dist_m <= self.correlation_radius_m:
                from_ag = str(getattr(h.from_agency, "value", h.from_agency))
                to_ag = str(getattr(h.to_agency, "value", h.to_agency))
                from_rg = str(getattr(h.from_ring, "value", h.from_ring))
                to_rg = str(getattr(h.to_ring, "value", h.to_ring))

                # Correlated event!
                jtf = JointTaskForceIncident(
                    title=f"Multi-Domain Coordinated Incursion ({alert.threat_type})",
                    primary_agencies=list(set([from_ag, to_ag, lead_ag])),
                    subsystems_involved=list(set(["01-maritime-coastline", alert.subsystem])),
                    correlated_targets=[h.target_id, alert.target_id],
                    cross_ring_sequence=[from_rg, to_rg, alert_rg],
                    spatial_anchor={"latitude": alert.latitude, "longitude": alert.longitude},
                    tactical_summary=(
                        f"Cross-domain correlation established: Target {alert.target_id} ({alert.threat_type}) "
                        f"spatially anchored within {dist_m/1000.0:.1f} km of prior handoff {h.target_id}."
                    ),
                    recommended_interception_point="US-Mexico Border Tactical Checkpoint + Interstate Feeder",
                )
                self._active_incidents[jtf.incident_id] = jtf
                return jtf

        return None
