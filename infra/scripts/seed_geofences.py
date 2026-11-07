"""
Project Frontier - PostGIS Geospatial Seeder
Populates the 3 Defense-in-Depth Security Rings based on US Census TIGER/Line & MarineCadastre:
1. RING_1_MARITIME: Exclusive Economic Zone (EEZ) & Maritime Approaches
2. RING_2_FEDERAL: US-Mexico & US-Canada 100-mile statutory border zone + POEs
3. RING_3_INTERSTATE: Strategic border states (CA, AZ, NM, TX, FL) & Highway Corridors (I-10, I-35, I-95)
"""

import asyncio
import os
import sys

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

try:
    import asyncpg
except ImportError:
    asyncpg = None

from shared.config import get_settings


# GeoJSON MultiPolygon definitions for the 3 Security Rings
GEOFENCE_DEFINITIONS = [
    {
        "ring_id": "RING_1_MARITIME",
        "name": "Maritime & Blue Border (USCG / US Navy)",
        "ring_level": 1,
        "lead_agencies": ["USCG", "US_NAVY"],
        "description": "Outer perimeter: US Territorial Waters (12 NM), Contiguous Zone (24 NM), and Exclusive Economic Zone (200 NM) covering Gulf of Mexico, Atlantic, and Pacific approaches.",
        "wkt": """
        MULTIPOLYGON((
            -- Gulf of Mexico Maritime Approach & EEZ
            (-97.8 25.0, -97.5 21.0, -82.0 21.0, -80.0 24.5, -82.0 28.5, -88.0 29.5, -94.0 29.0, -97.8 25.0)
        ), (
            -- Atlantic Coastal EEZ
            (-80.5 24.5, -74.0 24.5, -65.0 35.0, -66.0 45.0, -70.0 44.0, -75.0 35.0, -80.0 28.0, -80.5 24.5)
        ), (
            -- Pacific Coastal EEZ
            (-125.0 49.0, -132.0 49.0, -132.0 32.0, -120.0 28.0, -117.0 32.0, -122.0 38.0, -124.5 46.0, -125.0 49.0)
        ))
        """,
    },
    {
        "ring_id": "RING_2_FEDERAL",
        "name": "Federal Land & Air Border (CBP / US Army / USAF / FAA)",
        "ring_level": 2,
        "lead_agencies": ["CBP", "US_ARMY", "USAF", "FAA", "NGA"],
        "description": "Main defensive perimeter: 100-mile statutory border zone along US-Mexico Southern Border, US-Canada Northern Border, Sovereign Airspace, and official Ports of Entry.",
        "wkt": """
        MULTIPOLYGON((
            -- US-Mexico Southern Border Statutory 100-mile Zone
            (-117.5 32.8, -117.2 31.8, -114.5 31.5, -111.0 30.8, -108.0 31.0, -106.5 31.2, -104.0 29.5, -101.0 28.5, -97.5 25.5, -96.8 26.2, -99.5 28.8, -103.5 30.5, -106.0 32.5, -111.0 32.5, -115.0 33.2, -117.5 32.8)
        ), (
            -- US-Canada Northern Border Security Buffer
            (-124.5 49.5, -122.5 48.5, -110.0 48.5, -95.0 48.5, -82.0 45.0, -71.0 44.5, -67.0 45.0, -66.8 47.5, -74.0 45.5, -83.0 46.5, -95.0 49.5, -110.0 49.5, -124.5 49.5)
        ))
        """,
    },
    {
        "ring_id": "RING_3_INTERSTATE",
        "name": "Interstate & Internal Corridors (FBI / DEA / USDOT)",
        "ring_level": 3,
        "lead_agencies": ["FBI", "DEA", "USDOT", "STATE_TROOPERS"],
        "description": "Inner perimeter: Continental US state boundaries across CA, AZ, NM, TX, FL and strategic interstate transit corridors (I-10, I-35, I-95).",
        "wkt": """
        MULTIPOLYGON((
            -- Continental US Interior Heartland & Transport Corridors
            (-122.5 48.0, -122.5 34.0, -116.0 33.5, -106.0 33.0, -99.0 29.5, -96.5 28.0, -82.0 28.5, -76.0 35.0, -71.5 42.0, -74.0 44.5, -83.0 44.5, -95.0 48.0, -110.0 48.0, -122.5 48.0)
        ))
        """,
    },
]


async def seed_postgis_geofences():
    """Execute PostGIS upsert for the 3 Security Rings."""
    settings = get_settings()
    print("[FRONTIER GEO SEEDER] Connecting to PostgreSQL/PostGIS...")

    if asyncpg is None:
        print("[FRONTIER GEO SEEDER] asyncpg not available, skipping live database seeding.")
        return

    try:
        conn = await asyncpg.connect(
            host=settings.POSTGRES_HOST,
            port=settings.POSTGRES_PORT,
            user=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD,
            database=settings.POSTGRES_DB,
            timeout=5.0,
        )
    except Exception as e:
        print(f"[FRONTIER GEO SEEDER] Could not connect to PostGIS ({e}). Database might be offline.")
        return

    print("[FRONTIER GEO SEEDER] Seeding 3 Defense-in-Depth Security Rings...")
    for ring in GEOFENCE_DEFINITIONS:
        await conn.execute(
            """
            INSERT INTO security_rings (ring_id, name, ring_level, lead_agencies, description, geom)
            VALUES (
                $1, $2, $3, $4, $5,
                ST_Multi(ST_GeomFromText($6, 4326))
            )
            ON CONFLICT (ring_id) DO UPDATE SET
                name = EXCLUDED.name,
                ring_level = EXCLUDED.ring_level,
                lead_agencies = EXCLUDED.lead_agencies,
                description = EXCLUDED.description,
                geom = EXCLUDED.geom,
                updated_at = NOW();
            """,
            ring["ring_id"],
            ring["name"],
            ring["ring_level"],
            ring["lead_agencies"],
            ring["description"],
            ring["wkt"].strip(),
        )
        print(f"  + Seeded {ring['ring_id']} ({ring['name']})")

    await conn.close()
    print("[FRONTIER GEO SEEDER] PostGIS 3-Rings spatial geometries seeded successfully.")


if __name__ == "__main__":
    asyncio.run(seed_postgis_geofences())
