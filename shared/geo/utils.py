"""
Project Frontier - Geospatial Utilities & Geofencing Logic
Support for the 3 Defense-in-Depth Security Rings
"""

import math
from typing import NamedTuple, Optional
from shared.events.schemas import Agency, SecurityRing


class GeoPoint(NamedTuple):
    latitude: float
    longitude: float


# Earth's mean radius in meters and nautical miles
EARTH_RADIUS_METERS = 6371008.8
METERS_PER_NAUTICAL_MILE = 1852.0


def validate_coordinates(lat: float, lon: float) -> bool:
    """Validate latitude and longitude ranges."""
    return -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in meters."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_METERS * c


def haversine_distance_nautical_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in nautical miles."""
    return haversine_distance_meters(lat1, lon1, lat2, lon2) / METERS_PER_NAUTICAL_MILE


def initial_bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate initial compass bearing (0-360 degrees) from point 1 to point 2."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)
    initial_bearing = math.degrees(math.atan2(y, x))
    return (initial_bearing + 360.0) % 360.0


def point_in_polygon(lon: float, lat: float, polygon_coords: list[tuple[float, float]]) -> bool:
    """
    Ray-casting algorithm to determine if a point (lon, lat) is inside a 2D polygon.
    polygon_coords is a list of (lon, lat) tuples.
    """
    n = len(polygon_coords)
    inside = False
    p1x, p1y = polygon_coords[0]
    for i in range(n + 1):
        p2x, p2y = polygon_coords[i % n]
        if lat > min(p1y, p2y):
            if lat <= max(p1y, p2y):
                if lon <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (lat - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or lon <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside


# Simplified representative regional bounding boxes for fast pre-filtering
US_MEXICO_BORDER_BOX = {"min_lat": 25.0, "max_lat": 33.5, "min_lon": -118.0, "max_lon": -96.5}
US_CANADA_BORDER_BOX = {"min_lat": 44.0, "max_lat": 50.0, "min_lon": -125.0, "max_lon": -66.5}
GULF_OF_MEXICO_BOX = {"min_lat": 20.0, "max_lat": 30.5, "min_lon": -98.0, "max_lon": -80.0}
ATLANTIC_COAST_BOX = {"min_lat": 24.0, "max_lat": 46.0, "min_lon": -82.0, "max_lon": -65.0}
PACIFIC_COAST_BOX = {"min_lat": 28.0, "max_lat": 50.0, "min_lon": -133.0, "max_lon": -116.0}


def classify_fast_security_ring(lon: float, lat: float) -> tuple[SecurityRing, Agency]:
    """
    Fast heuristic security ring classification for local memory processing
    prior to or alongside PostGIS authoritative queries.
    """
    # 1. Federal Land & Air Border Zone (Ring 2)
    in_south_border = (
        US_MEXICO_BORDER_BOX["min_lat"] <= lat <= US_MEXICO_BORDER_BOX["max_lat"]
        and US_MEXICO_BORDER_BOX["min_lon"] <= lon <= US_MEXICO_BORDER_BOX["max_lon"]
    )
    in_north_border = (
        US_CANADA_BORDER_BOX["min_lat"] <= lat <= US_CANADA_BORDER_BOX["max_lat"]
        and US_CANADA_BORDER_BOX["min_lon"] <= lon <= US_CANADA_BORDER_BOX["max_lon"]
    )

    if in_south_border or in_north_border:
        return SecurityRing.RING_2_FEDERAL, Agency.CBP

    # 2. Maritime & Blue Border (Ring 1)
    in_gulf = (
        GULF_OF_MEXICO_BOX["min_lat"] <= lat <= GULF_OF_MEXICO_BOX["max_lat"]
        and GULF_OF_MEXICO_BOX["min_lon"] <= lon <= GULF_OF_MEXICO_BOX["max_lon"]
        and lat < 28.5
    )
    in_pacific = (
        PACIFIC_COAST_BOX["min_lat"] <= lat <= PACIFIC_COAST_BOX["max_lat"]
        and PACIFIC_COAST_BOX["min_lon"] <= lon <= PACIFIC_COAST_BOX["max_lon"]
        and lon < -124.0
    )
    in_atlantic = (
        ATLANTIC_COAST_BOX["min_lat"] <= lat <= ATLANTIC_COAST_BOX["max_lat"]
        and ATLANTIC_COAST_BOX["min_lon"] <= lon <= ATLANTIC_COAST_BOX["max_lon"]
        and lon > -75.0
    )

    if in_gulf or in_pacific or in_atlantic:
        return SecurityRing.RING_1_MARITIME, Agency.USCG

    # 3. Default to Interior / Interstate Corridors (Ring 3)
    return SecurityRing.RING_3_INTERSTATE, Agency.FBI

