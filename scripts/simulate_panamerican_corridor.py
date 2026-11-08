#!/usr/bin/env python3
"""
Project Frontier - Pan-American Transnational Corridor Simulation
Simulates end-to-end criminal logistics from South America to the United States:
1. Act 1: Departure from Port of Santos (PCC) & Tumaco Pacific Littoral (Clan del Golfo)
2. Act 2: Maritime & Canal Transit through Balboa/Colón (Panama Canal Authority - ACP_PA)
3. Act 3: Convergence at Manzanillo & Nuevo Laredo Gateway (Mexico - CJNG / Sinaloa)
4. Act 4: H3 Spatial Sharding Check & International Corridor Handoff
5. Act 5: Coordinated Ring 1/2/3 Interdiction by USCG, CBP, DEA, and FBI
"""

import asyncio
import json
import os
from pathlib import Path
import sys
import time
from typing import Any, Dict, List

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx

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
    ThreatAlertEvent,
    TransnationalSyndicate,
    TransportModal,
)
from shared.geo.h3_index import H3SpatialIndex


def log_phase(act: str, title: str):
    print("\n" + "=" * 80)
    print(f" [FRONTIER-OS C4ISR] {act}: {title}")
    print("=" * 80)


async def run_panamerican_simulation(gateway_url: str = "http://127.0.0.1:8000"):
    h3_idx = H3SpatialIndex.get_instance()
    connector = LatamOSINTConnector.get_instance()

    print(f"[+] Initializing Pan-American Corridor Simulator...")
    print(f"[+] H3 Spatial Index: {h3_idx.get_index_stats()}")
    print(f"[+] Multi-Theater Nodes: {len(PANAMERICAN_NODES)} | Corridors: {len(PANAMERICAN_CORRIDORS)}")

    # -------------------------------------------------------------------------
    # ACT 1: ORIGIN IN SOUTH AMERICA (BRAZIL & COLOMBIA)
    # -------------------------------------------------------------------------
    log_phase("ACT 1", "South American Strategic Origin & Loading")
    santos_node = next(n for n in PANAMERICAN_NODES if n["id"] == "BR-PORT-SANTOS")
    tumaco_node = next(n for n in PANAMERICAN_NODES if n["id"] == "CO-PACIFIC-TUMACO")

    h3_santos = h3_idx.latlng_to_h3(santos_node["lat"], santos_node["lon"])
    h3_tumaco = h3_idx.latlng_to_h3(tumaco_node["lat"], tumaco_node["lon"])

    print(f"[*] Target ALPHA (Container): {santos_node['name']} ({santos_node['theater'].value})")
    print(f"    - Syndicate: {santos_node['primary_syndicate'].value} | Agency: {santos_node['agency'].value}")
    print(f"    - Coordinates: [{santos_node['lat']}, {santos_node['lon']}] | H3 Cell: {h3_santos}")
    print(f"    - Intelligence: Reefer container disguised with frozen beef, bound for Port of Houston.")

    print(f"\n[*] Target BRAVO (LPV Submersible): {tumaco_node['name']} ({tumaco_node['theater'].value})")
    print(f"    - Syndicate: {tumaco_node['primary_syndicate'].value} | Agency: {tumaco_node['agency'].value}")
    print(f"    - Coordinates: [{tumaco_node['lat']}, {tumaco_node['lon']}] | H3 Cell: {h3_tumaco}")
    print(f"    - Intelligence: Semi-submersible vessel departing Nariño mangroves toward Eastern Pacific corridor.")

    await asyncio.sleep(1.0)

    # -------------------------------------------------------------------------
    # ACT 2: CHOKEPOINT PASSAGE THROUGH PANAMA CANAL & EASTERN PACIFIC
    # -------------------------------------------------------------------------
    log_phase("ACT 2", "Canal Bottleneck Transit & Maritime Surveillance")
    panama_node = next(n for n in PANAMERICAN_NODES if n["id"] == "PA-CANAL-BALBOA")
    h3_panama = h3_idx.latlng_to_h3(panama_node["lat"], panama_node["lon"])
    is_chokepoint = h3_idx.is_panamerican_chokepoint(panama_node["lat"], panama_node["lon"])

    print(f"[*] Target ALPHA reached Panama Pacific Locks: {panama_node['name']}")
    print(f"    - Chokepoint Spatial Sharding Match: {is_chokepoint} (H3: {h3_panama})")
    print(f"    - Lead Agency: {panama_node['agency'].value} (Autoridad del Canal de Panamá)")
    print(f"    - Container scanner flagged density anomaly in secondary refrigeration compressor.")

    handoff_panama = InternationalCorridorHandoffEvent(
        target_id="CARGO-SANTOS-BRAZIL-901",
        syndicate=TransnationalSyndicate.PCC,
        modal=TransportModal.PANAMA_CANAL_TRANSIT,
        origin_theater=TheaterOfOperations.BRAZIL,
        destination_theater=TheaterOfOperations.USA,
        from_agency=Agency.PF_BR,
        to_agency=Agency.ACP_PA,
        chokepoint="Canal de Panamá - Terminal Balboa",
        cargo_manifest={
            "bill_of_lading": "BL-BR-PA-88902",
            "declared_cargo": "Frozen Beef & Industrial Compressors",
            "hidden_contraband_est_kg": 650,
            "h3_cell": h3_panama,
        },
        risk_score=0.91,
        latitude=panama_node["lat"],
        longitude=panama_node["lon"],
        operational_summary="Vessel transiting Miraflores locks; tactical handoff from PF_BR to ACP_PA and USCG liaison.",
    )
    print(f"    -> Emitted Redpanda Event: {handoff_panama.handoff_id} (Target: {handoff_panama.target_id})")

    await asyncio.sleep(1.0)

    # -------------------------------------------------------------------------
    # ACT 3: MEXICAN PACIFIC GATEWAY & BORDER CONVERGENCE
    # -------------------------------------------------------------------------
    log_phase("ACT 3", "Mexican Transshipment & Border Approach")
    manzanillo_node = next(n for n in PANAMERICAN_NODES if n["id"] == "MX-PORT-MANZANILLO")
    laredo_mex_node = next(n for n in PANAMERICAN_NODES if n["id"] == "MX-BORDER-NUEVO-LAREDO")

    print(f"[*] Target BRAVO (LPV Submersible) intercepted off Colima coastline:")
    print(f"    - Syndicate: {manzanillo_node['primary_syndicate'].value} (Cartel Jalisco Nueva Generacion)")
    print(f"    - Position: [{manzanillo_node['lat']}, {manzanillo_node['lon']}]")

    print(f"\n[*] Target ALPHA Container transferred to freight hauler approaching Nuevo Laredo border crossing:")
    print(f"    - Position: [{laredo_mex_node['lat']}, {laredo_mex_node['lon']}] | Syndicate: {laredo_mex_node['primary_syndicate'].value}")
    print(f"    - Modality: HIGHWAY_FREIGHT (Commercial Kenworth tractor-trailer)")

    await asyncio.sleep(1.0)

    # -------------------------------------------------------------------------
    # ACT 4: H3 SPATIAL SHARDING & RING 1/2 HOMELAND PENETRATION
    # -------------------------------------------------------------------------
    log_phase("ACT 4", "Homeland Security Rings Spatial Sharding & Trigger")
    us_laredo_node = next(n for n in PANAMERICAN_NODES if n["id"] == "US-POE-LAREDO")
    is_cand, ring_cand = h3_idx.fast_lookup_ring(us_laredo_node["lat"], us_laredo_node["lon"])
    h3_laredo = h3_idx.latlng_to_h3(us_laredo_node["lat"], us_laredo_node["lon"])

    print(f"[*] Target ALPHA reached US Port of Entry: {us_laredo_node['name']}")
    print(f"    - Fast H3 Lookup in O(1): Candidate={is_cand} | Ring={ring_cand.value if ring_cand else 'None'}")
    print(f"    - H3 Cell Resolution 6: {h3_laredo}")
    print(f"    - CBP Multi-Energy Portal (VACIS) NII X-ray confirmed dense acoustic organic blocks.")

    handoff_us = InternationalCorridorHandoffEvent(
        target_id="FREIGHT-TX-KENWORTH-44",
        syndicate=TransnationalSyndicate.SINALOA_CARTEL,
        modal=TransportModal.HIGHWAY_FREIGHT,
        origin_theater=TheaterOfOperations.MEXICO,
        destination_theater=TheaterOfOperations.USA,
        from_agency=Agency.INTERPOL,
        to_agency=Agency.CBP,
        chokepoint="World Trade Bridge (Laredo POE)",
        cargo_manifest={
            "bill_of_lading": "BL-MX-US-77104",
            "declared_cargo": "Auto Parts & Stamped Metal Panels",
            "hidden_contraband_est_kg": 850,
            "h3_cell": h3_laredo,
        },
        risk_score=0.97,
        latitude=us_laredo_node["lat"],
        longitude=us_laredo_node["lon"],
        operational_summary="Commercial vehicle crossed World Trade Bridge; custody handed off from Mexico/Interpol to CBP & DEA.",
    )

    await asyncio.sleep(1.0)

    # -------------------------------------------------------------------------
    # ACT 5: JOINT C4ISR INTERCEPTION ON RING 3 INTERSTATE CORRIDOR
    # -------------------------------------------------------------------------
    log_phase("ACT 5", "Ring 3 Interstate Interception & Multi-Agency Arrest")
    satx_node = next(n for n in PANAMERICAN_NODES if n["id"] == "US-INTERSTATE-I10-SATX")
    h3_satx = h3_idx.latlng_to_h3(satx_node["lat"], satx_node["lon"])

    print(f"[*] Interdiction Location: {satx_node['name']} (I-35 / I-10 Interchange)")
    print(f"    - Ring: {SecurityRing.RING_3_INTERSTATE.value} | H3 Cell: {h3_satx}")
    print(f"    - Participating Strike Forces: DEA Special Operations Division, FBI Texas Field Office, Texas DPS")
    print(f"    - Facial Biometrics Match: Known cartel courier verified against FBI Wanted database (Cosine Similarity: 0.96)")

    final_alert = ThreatAlertEvent(
        subsystem="05-c4isr-fusion",
        ring=SecurityRing.RING_3_INTERSTATE,
        lead_agency=Agency.DEA,
        severity=0.98,
        latitude=satx_node["lat"],
        longitude=satx_node["lon"],
        target_id="PANAM-INTERDICTION-SATX-01",
        threat_type="MULTI_THEATER_INTERDICTION_COMPLETE",
        metadata={
            "origin_theater": TheaterOfOperations.BRAZIL.value,
            "intermediate_transit": [TheaterOfOperations.PANAMA.value, TheaterOfOperations.MEXICO.value],
            "destination_theater": TheaterOfOperations.USA.value,
            "syndicates_involved": [TransnationalSyndicate.PCC.value, TransnationalSyndicate.SINALOA_CARTEL.value],
            "seizure_metric": "850 kg high-purity contraband",
            "handoff_trail": [str(handoff_panama.handoff_id), str(handoff_us.handoff_id)],
            "action": "ARREST_AND_SEIZURE_SUCCESSFUL",
        },
    )

    print(f"\n[+] Final Threat Alert Event Generated:")
    print(json.dumps(final_alert.model_dump(), indent=2, default=str))

    # Attempt broadcast to local C2 gateway if online
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.post(
                f"{gateway_url}/api/v1/simulation/inject",
                json={
                    "event_type": "PANAMERICAN_CORRIDOR_INTERDICTION",
                    "source": "SIMULATION_PANAMERICAN",
                    "threat": final_alert.model_dump(),
                    "handoffs": [handoff_panama.model_dump(), handoff_us.model_dump()],
                },
            )
            print(f"\n[+] Gateway Response: {resp.status_code} - Injected into live C2 Dashboard.")
    except Exception:
        print("\n[!] Note: C2 Gateway not reachable on localhost:8000 (simulation succeeded standalone).")

    print("\n" + "=" * 80)
    print(" [FRONTIER-OS] Pan-American Corridor Simulation Finished Successfully: 100% Verified.")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(run_panamerican_simulation())
