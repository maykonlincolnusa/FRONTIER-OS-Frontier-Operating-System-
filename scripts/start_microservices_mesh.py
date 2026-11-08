"""
Project Frontier - C4ISR Microservices Mesh Supervisor
Launches and supervises all 6 domain microservices (Ports 8001-8006) alongside the C2 Gateway (Port 8000).
"""

import asyncio
from pathlib import Path
import sys
import uvicorn

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

SERVICES = [
    ("services.maritime_coastline.main:app", 8001, "01-maritime-coastline"),
    ("services.airspace_shield.main:app", 8002, "02-airspace-shield"),
    ("services.narcotics_intel.main:app", 8003, "03-narcotics-intel"),
    ("services.criminal_interstate.main:app", 8004, "04-criminal-interstate"),
    ("services.geospatial_recon.main:app", 8005, "05-geospatial-recon"),
    ("services.c2_copilot.main:app", 8006, "06-c2-copilot"),
]


async def run_service(app_path: str, port: int, name: str):
    config = uvicorn.Config(
        app_path,
        host="0.0.0.0",
        port=port,
        log_level="warning",
        access_log=False,
    )
    server = uvicorn.Server(config)
    print(f"[MESH] Starting microservice {name} on http://0.0.0.0:{port} ...")
    await server.serve()


async def main():
    print("==========================================================")
    print(" FRONTIER-OS // C4ISR MICROSERVICES MESH (PORTS 8001-8006)")
    print("==========================================================")
    tasks = [
        asyncio.create_task(run_service(app_path, port, name))
        for app_path, port, name in SERVICES
    ]
    await asyncio.gather(*tasks)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit(0)
