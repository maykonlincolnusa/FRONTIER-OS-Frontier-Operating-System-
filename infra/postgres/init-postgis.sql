-- =============================================================================
-- PROJECT FRONTIER (FRONTIER-C4ISR) - PostGIS Initialization Script
-- Single Source of Truth for Spatial Database & 3-Ring Defense in Depth
-- =============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Security Rings Definition Table
CREATE TABLE IF NOT EXISTS security_rings (
    ring_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    ring_level INT NOT NULL UNIQUE,
    lead_agencies TEXT[] NOT NULL,
    description TEXT NOT NULL,
    geom GEOMETRY(MultiPolygon, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tracked Entities (Vessels, Aircraft, Ground Vehicles, Persons)
CREATE TABLE IF NOT EXISTS tracked_entities (
    target_id VARCHAR(100) PRIMARY KEY,
    target_type VARCHAR(50) NOT NULL, -- VESSEL, AIRCRAFT, VEHICLE, PERSON
    current_ring VARCHAR(50) REFERENCES security_rings(ring_id),
    lead_agency VARCHAR(50) NOT NULL,
    last_location GEOMETRY(Point, 4326) NOT NULL,
    heading DOUBLE PRECISION,
    speed_knots DOUBLE PRECISION,
    altitude_feet DOUBLE PRECISION,
    metadata JSONB DEFAULT '{}'::jsonb,
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Threat Alerts (Emitted by Deep Learning subsystems)
CREATE TABLE IF NOT EXISTS threat_alerts (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    subsystem VARCHAR(50) NOT NULL,
    ring VARCHAR(50) REFERENCES security_rings(ring_id),
    lead_agency VARCHAR(50) NOT NULL,
    severity DOUBLE PRECISION NOT NULL CHECK (severity >= 0.0 AND severity <= 1.0),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOMETRY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    target_id VARCHAR(100) NOT NULL,
    threat_type VARCHAR(100) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 5. Jurisdiction Handoff Events (Border Crossings & Agency Handoffs)
CREATE TABLE IF NOT EXISTS jurisdiction_handoffs (
    handoff_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    target_id VARCHAR(100) NOT NULL,
    from_ring VARCHAR(50) REFERENCES security_rings(ring_id),
    to_ring VARCHAR(50) REFERENCES security_rings(ring_id),
    from_agency VARCHAR(50) NOT NULL,
    to_agency VARCHAR(50) NOT NULL,
    last_known_lat DOUBLE PRECISION NOT NULL,
    last_known_lon DOUBLE PRECISION NOT NULL,
    location GEOMETRY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(last_known_lon, last_known_lat), 4326)) STORED,
    reason TEXT NOT NULL
);

-- 6. Interstate Strategic Corridors (I-10, I-35, I-95, etc.)
CREATE TABLE IF NOT EXISTS interstate_corridors (
    corridor_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    route_geom GEOMETRY(MultiLineString, 4326) NOT NULL,
    buffer_geom GEOMETRY(MultiPolygon, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Spatial & Relational Indexes
CREATE INDEX IF NOT EXISTS idx_security_rings_geom ON security_rings USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_tracked_entities_location ON tracked_entities USING GIST (last_location);
CREATE INDEX IF NOT EXISTS idx_threat_alerts_location ON threat_alerts USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_threat_alerts_target ON threat_alerts (target_id);
CREATE INDEX IF NOT EXISTS idx_threat_alerts_timestamp ON threat_alerts (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_jurisdiction_handoffs_location ON jurisdiction_handoffs USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_jurisdiction_handoffs_target ON jurisdiction_handoffs (target_id);
CREATE INDEX IF NOT EXISTS idx_jurisdiction_handoffs_timestamp ON jurisdiction_handoffs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_interstate_corridors_buffer ON interstate_corridors USING GIST (buffer_geom);

-- =============================================================================
-- SEED DATA: The 3 Defense-in-Depth Security Rings
-- =============================================================================

-- RING 1: MARITIME & BLUE BORDER (Territorial Sea 12NM, Contiguous Zone 24NM, EEZ 200NM)
-- Agencies: USCG & US Navy
INSERT INTO security_rings (ring_id, name, ring_level, lead_agencies, description, geom)
VALUES (
    'RING_1_MARITIME',
    'Maritime & Blue Border',
    1,
    ARRAY['USCG', 'US_NAVY'],
    'Outer security ring: Territorial waters (12 NM), Contiguous Zone (24 NM), and Exclusive Economic Zone (200 NM) covering Atlantic, Pacific, and Gulf of Mexico approaches.',
    ST_Multi(ST_GeomFromText(
        'MULTIPOLYGON((
            -- Gulf of Mexico Outer Maritime Band
            (-97.5 25.0, -97.5 21.0, -82.0 21.0, -80.0 24.5, -82.0 28.0, -88.0 29.0, -94.0 28.5, -97.5 25.0)
        ), (
            -- Atlantic Coastal & EEZ Band
            (-80.0 24.5, -74.0 24.5, -65.0 35.0, -66.0 45.0, -70.0 44.0, -75.0 35.0, -80.0 28.0, -80.0 24.5)
        ), (
            -- Pacific Coastal & EEZ Band
            (-125.0 49.0, -132.0 49.0, -132.0 32.0, -120.0 28.0, -117.0 32.0, -122.0 38.0, -124.5 46.0, -125.0 49.0)
        ))',
        4326
    ))
) ON CONFLICT (ring_id) DO UPDATE SET
    name = EXCLUDED.name,
    geom = EXCLUDED.geom,
    lead_agencies = EXCLUDED.lead_agencies,
    description = EXCLUDED.description;

-- RING 2: FEDERAL LAND & AIR BORDER (US Northern & Southern Borders, POEs, Sovereign Airspace)
-- Agencies: CBP, US Army, USAF, FAA, NGA
INSERT INTO security_rings (ring_id, name, ring_level, lead_agencies, description, geom)
VALUES (
    'RING_2_FEDERAL',
    'Federal Land & Air Border',
    2,
    ARRAY['CBP', 'US_ARMY', 'USAF', 'FAA', 'NGA'],
    'Main security ring: US-Mexico Southern Border statutory buffer zone (100-mile frontier), US-Canada Northern Border buffer, Official Ports of Entry (POEs) and Sovereign Airspace.',
    ST_Multi(ST_GeomFromText(
        'MULTIPOLYGON((
            -- US-Mexico Border Tactical Security Zone (100-mile statutory zone)
            (-117.5 32.8, -117.2 31.8, -114.5 31.5, -111.0 30.8, -108.0 31.0, -106.5 31.2, -104.0 29.5, -101.0 28.5, -97.5 25.5, -96.8 26.2, -99.5 28.8, -103.5 30.5, -106.0 32.5, -111.0 32.5, -115.0 33.2, -117.5 32.8)
        ), (
            -- US-Canada Northern Border Tactical Security Zone
            (-124.5 49.5, -122.5 48.5, -110.0 48.5, -95.0 48.5, -82.0 45.0, -71.0 44.5, -67.0 45.0, -66.8 47.5, -74.0 45.5, -83.0 46.5, -95.0 49.5, -110.0 49.5, -124.5 49.5)
        ))',
        4326
    ))
) ON CONFLICT (ring_id) DO UPDATE SET
    name = EXCLUDED.name,
    geom = EXCLUDED.geom,
    lead_agencies = EXCLUDED.lead_agencies,
    description = EXCLUDED.description;

-- RING 3: INTERSTATE & INTERNAL CORRIDORS (Internal 50 states, Interstates I-10, I-35, I-95, State Borders)
-- Agencies: FBI, DEA, USDOT, State Troopers
INSERT INTO security_rings (ring_id, name, ring_level, lead_agencies, description, geom)
VALUES (
    'RING_3_INTERSTATE',
    'Interstate & Internal Corridors',
    3,
    ARRAY['FBI', 'DEA', 'USDOT', 'STATE_TROOPERS'],
    'Internal security ring: Continental US interior geography, state boundaries, and vital interstate transit corridors (I-10, I-35, I-95).',
    ST_Multi(ST_GeomFromText(
        'MULTIPOLYGON((
            -- Continental US Interior Heartland & Transport Corridors
            (-122.5 48.0, -122.5 34.0, -116.0 33.5, -106.0 33.0, -99.0 29.5, -96.5 28.0, -82.0 28.5, -76.0 35.0, -71.5 42.0, -74.0 44.5, -83.0 44.5, -95.0 48.0, -110.0 48.0, -122.5 48.0)
        ))',
        4326
    ))
) ON CONFLICT (ring_id) DO UPDATE SET
    name = EXCLUDED.name,
    geom = EXCLUDED.geom,
    lead_agencies = EXCLUDED.lead_agencies,
    description = EXCLUDED.description;

-- =============================================================================
-- SEED DATA: Key Strategic Interstate Corridors
-- =============================================================================
INSERT INTO interstate_corridors (corridor_id, name, description, route_geom, buffer_geom)
VALUES
(
    'I-10',
    'Interstate 10 (Southern Transcontinental)',
    'Southernmost transcontinental highway connecting Santa Monica CA to Jacksonville FL through TX borderlands.',
    ST_Multi(ST_GeomFromText('MULTILINESTRING((-118.49 34.01, -112.07 33.45, -106.48 31.76, -98.49 29.42, -95.36 29.76, -81.65 30.33))', 4326)),
    ST_Multi(ST_Buffer(ST_GeomFromText('MULTILINESTRING((-118.49 34.01, -112.07 33.45, -106.48 31.76, -98.49 29.42, -95.36 29.76, -81.65 30.33))', 4326)::geography, 25000)::geometry)
),
(
    'I-35',
    'Interstate 35 (NAFTA / Central Narcotics Artery)',
    'Major north-south corridor originating at Laredo TX border crossing to Duluth MN.',
    ST_Multi(ST_GeomFromText('MULTILINESTRING((-99.50 27.50, -98.49 29.42, -97.74 30.26, -96.79 32.77, -97.33 37.68, -94.57 39.09, -93.60 41.58, -93.26 44.97, -92.10 46.78))', 4326)),
    ST_Multi(ST_Buffer(ST_GeomFromText('MULTILINESTRING((-99.50 27.50, -98.49 29.42, -97.74 30.26, -96.79 32.77, -97.33 37.68, -94.57 39.09, -93.60 41.58, -93.26 44.97, -92.10 46.78))', 4326)::geography, 25000)::geometry)
),
(
    'I-95',
    'Interstate 95 (East Coast Corridor)',
    'Primary north-south corridor connecting Miami FL to Houlton ME border crossing.',
    ST_Multi(ST_GeomFromText('MULTILINESTRING((-80.19 25.76, -81.65 30.33, -80.84 35.22, -77.43 37.54, -77.03 38.90, -75.16 39.95, -74.00 40.71, -71.05 42.36, -67.84 46.12))', 4326)),
    ST_Multi(ST_Buffer(ST_GeomFromText('MULTILINESTRING((-80.19 25.76, -81.65 30.33, -80.84 35.22, -77.43 37.54, -77.03 38.90, -75.16 39.95, -74.00 40.71, -71.05 42.36, -67.84 46.12))', 4326)::geography, 25000)::geometry)
) ON CONFLICT (corridor_id) DO NOTHING;

-- =============================================================================
-- POSTGIS STORED PROCEDURES & SPATIAL FUNCTIONS
-- =============================================================================

-- Function: Detect which Security Ring contains the point coordinates
CREATE OR REPLACE FUNCTION fn_detect_security_ring(
    p_lon DOUBLE PRECISION,
    p_lat DOUBLE PRECISION
)
RETURNS TABLE (
    ring_id VARCHAR(50),
    ring_name VARCHAR(100),
    lead_agencies TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_pt GEOMETRY(Point, 4326);
BEGIN
    v_pt := ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326);
    
    -- Priority check: Order by ring_level (Ring 1 Maritime -> Ring 2 Federal -> Ring 3 Interstate)
    RETURN QUERY
    SELECT sr.ring_id, sr.name, sr.lead_agencies
    FROM security_rings sr
    WHERE ST_Contains(sr.geom, v_pt)
    ORDER BY sr.ring_level ASC
    LIMIT 1;
END;
$$;

-- Function: Process Entity Position, Detect Geofence Crossing and Auto-Create Handoff
CREATE OR REPLACE FUNCTION fn_process_entity_position(
    p_target_id VARCHAR(100),
    p_target_type VARCHAR(50),
    p_lon DOUBLE PRECISION,
    p_lat DOUBLE PRECISION,
    p_speed_knots DOUBLE PRECISION DEFAULT NULL,
    p_heading DOUBLE PRECISION DEFAULT NULL,
    p_altitude_feet DOUBLE PRECISION DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
    target_id VARCHAR(100),
    previous_ring VARCHAR(50),
    new_ring VARCHAR(50),
    handoff_triggered BOOLEAN,
    from_agency VARCHAR(50),
    to_agency VARCHAR(50),
    handoff_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_pt GEOMETRY(Point, 4326);
    v_detected_ring VARCHAR(50);
    v_detected_agencies TEXT[];
    v_new_lead_agency VARCHAR(50);
    v_prev_ring VARCHAR(50);
    v_prev_agency VARCHAR(50);
    v_handoff_id UUID := NULL;
    v_handoff_triggered BOOLEAN := FALSE;
    v_reason TEXT;
BEGIN
    v_pt := ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326);

    -- Find matching ring
    SELECT r.ring_id, r.lead_agencies
    INTO v_detected_ring, v_detected_agencies
    FROM fn_detect_security_ring(p_lon, p_lat) r;

    -- If point is outside predefined rings, default based on coordinates/target_type
    IF v_detected_ring IS NULL THEN
        IF p_target_type = 'VESSEL' THEN
            v_detected_ring := 'RING_1_MARITIME';
            v_new_lead_agency := 'USCG';
        ELSIF p_target_type = 'AIRCRAFT' THEN
            v_detected_ring := 'RING_2_FEDERAL';
            v_new_lead_agency := 'USAF';
        ELSE
            v_detected_ring := 'RING_3_INTERSTATE';
            v_new_lead_agency := 'FBI';
        END IF;
    ELSE
        v_new_lead_agency := v_detected_agencies[1];
    END IF;

    -- Check existing entity state
    SELECT current_ring, lead_agency
    INTO v_prev_ring, v_prev_agency
    FROM tracked_entities
    WHERE tracked_entities.target_id = p_target_id;

    -- Detect Ring Transition
    IF v_prev_ring IS NOT NULL AND v_prev_ring <> v_detected_ring THEN
        v_handoff_triggered := TRUE;
        v_reason := format('Geofence boundary breach: Target %s transitioned from %s (%s) to %s (%s)',
                           p_target_id, v_prev_ring, v_prev_agency, v_detected_ring, v_new_lead_agency);

        INSERT INTO jurisdiction_handoffs (
            target_id,
            from_ring,
            to_ring,
            from_agency,
            to_agency,
            last_known_lat,
            last_known_lon,
            reason
        ) VALUES (
            p_target_id,
            v_prev_ring,
            v_detected_ring,
            v_prev_agency,
            v_new_lead_agency,
            p_lat,
            p_lon,
            v_reason
        ) RETURNING jurisdiction_handoffs.handoff_id INTO v_handoff_id;
    END IF;

    -- Upsert tracked entity
    INSERT INTO tracked_entities (
        target_id,
        target_type,
        current_ring,
        lead_agency,
        last_location,
        speed_knots,
        heading,
        altitude_feet,
        metadata,
        last_seen
    ) VALUES (
        p_target_id,
        p_target_type,
        v_detected_ring,
        v_new_lead_agency,
        v_pt,
        p_speed_knots,
        p_heading,
        p_altitude_feet,
        p_metadata,
        NOW()
    ) ON CONFLICT (target_id) DO UPDATE SET
        target_type = EXCLUDED.target_type,
        current_ring = EXCLUDED.current_ring,
        lead_agency = EXCLUDED.lead_agency,
        last_location = EXCLUDED.last_location,
        speed_knots = COALESCE(EXCLUDED.speed_knots, tracked_entities.speed_knots),
        heading = COALESCE(EXCLUDED.heading, tracked_entities.heading),
        altitude_feet = COALESCE(EXCLUDED.altitude_feet, tracked_entities.altitude_feet),
        metadata = tracked_entities.metadata || EXCLUDED.metadata,
        last_seen = NOW();

    RETURN QUERY SELECT
        p_target_id,
        v_prev_ring,
        v_detected_ring,
        v_handoff_triggered,
        v_prev_agency,
        v_new_lead_agency,
        v_handoff_id;
END;
$$;

