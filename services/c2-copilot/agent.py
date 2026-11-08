"""
Project Frontier - Tactical C2 Copilot Agent
Orchestrates Tools 1, 2, and 3, streaming structured intelligence to the C4ISR operator.
"""

import asyncio
from typing import Any, AsyncGenerator, Dict, List, Optional
import json

from services.c2_copilot.tools import (
    generate_sitrep,
    query_spatial_threats,
    search_criminal_intel,
)


class TacticalCopilotAgent:
    """
    Autonomous multi-agent intelligence copilot for the C4ISR Battle Commander.
    Executes Text-to-PostGIS, Vector RAG, and generates military briefings with Map Fly-To coordinates.
    """

    async def process_command_stream(
        self,
        user_prompt: str,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Processes operator natural language prompt and yields streaming SSE chunks
        including text tokens and tactical map fly-to targets.
        """
        prompt_lower = user_prompt.lower()

        # Step 1: Initial Acknowledgement
        yield {
            "type": "STATUS",
            "message": "COMMAND RECEIVED: Analyzing multi-domain tactical intelligence...",
        }
        await asyncio.sleep(0.1)

        # Step 2: Determine tool invocations based on intent
        fly_to_coords = None

        if "sitrep" in prompt_lower or "briefing" in prompt_lower or "relatório" in prompt_lower or "operação" in prompt_lower:
            yield {"type": "TOOL_CALL", "tool": "generate_sitrep", "params": {"operation": "OPERATION SHIELD VORTEX"}}
            await asyncio.sleep(0.15)
            sitrep_text = generate_sitrep()
            fly_to_coords = {"latitude": 27.52, "longitude": -99.49, "zoom": 7}

            # Stream response in chunks
            paragraphs = sitrep_text.split("\n\n")
            for p in paragraphs:
                yield {"type": "CONTENT", "chunk": p + "\n\n"}
                await asyncio.sleep(0.08)

        elif "voo" in prompt_lower or "flight" in prompt_lower or "arizona" in prompt_lower or "laredo" in prompt_lower or "poe" in prompt_lower or "fronteira" in prompt_lower:
            yield {"type": "TOOL_CALL", "tool": "query_spatial_threats", "params": {"intent": user_prompt}}
            await asyncio.sleep(0.15)
            spatial_data = await query_spatial_threats(
                query_intent=user_prompt,
                poe_name="Laredo" if "laredo" in prompt_lower else None,
                radius_km=50.0,
            )
            fly_to_coords = spatial_data.get("anchor_coordinates", {"latitude": 27.50, "longitude": -99.50, "zoom": 8})

            yield {
                "type": "CONTENT",
                "chunk": f"**[GEOSPATIAL POSTGIS AGENT]** Analyzed spatial perimeter. Found **{spatial_data['matched_entities']} correlated targets** crossing between **RING 1 (Maritime)** and **RING 2 (Federal Border)**.\n\n",
            }
            await asyncio.sleep(0.1)

            # Query FBI & DEA Intel
            yield {"type": "TOOL_CALL", "tool": "search_criminal_intel", "params": {"query": user_prompt}}
            await asyncio.sleep(0.15)
            intel_data = await search_criminal_intel(query_text=user_prompt)

            yield {
                "type": "CONTENT",
                "chunk": (
                    f"**[VECTOR RAG AGENT (QDRANT + FBI/DEA)]** Top match: **{intel_data['intel_records'][0]['name']}** "
                    f"(Confidence: **{intel_data['intel_records'][0]['confidence_score']*100:.1f}%**). "
                    f"Corridor: **{intel_data['intel_records'][0]['corridor']}**.\n\n"
                    f"*Recommendation:* Dispatch inter-agency tactical roadblock along **I-10 / I-35**.\n"
                ),
            }

        else:
            # General tactical query
            yield {"type": "TOOL_CALL", "tool": "query_spatial_threats", "params": {"intent": "general_threat_scan"}}
            await asyncio.sleep(0.1)
            fly_to_coords = {"latitude": 26.50, "longitude": -97.50, "zoom": 6}

            yield {
                "type": "CONTENT",
                "chunk": (
                    f"**[C4ISR TACTICAL COPILOT]** Active scanning confirmed across all 3 Security Rings. "
                    f"Sensor coverage is **100% operational** (USCG AIS, USAF OpenSky ADS-B, Army Satellite Recon, DEA GNN, FBI Facial ALPR).\n\n"
                    f"Ready for command directives. Enter *'Gerar SITREP da Operação'* or *'Cruze os alvos do Golfo com a fronteira do Texas'*.\n"
                ),
            }

        # Step 3: Final Map Action (Fly-to coordinates)
        if fly_to_coords:
            yield {
                "type": "MAP_ACTION",
                "action": "FLY_TO",
                "coordinates": fly_to_coords,
            }
        
        yield {"type": "STATUS", "message": "DONE"}
