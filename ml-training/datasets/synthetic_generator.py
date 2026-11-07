"""
Project Frontier - Synthetic Telemetry & Trajectory Dataset Generator
Generates realistic training datasets for:
1. ADS-B Flight Trajectories (Normal commercial vs. Clandestine low-altitude border evasion)
2. AIS Maritime Trajectories (Normal shipping channels vs. Dark ships / Loitering rendezvous)
"""

import math
import random
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Tuple


def generate_flight_trajectory(
    callsign: str,
    is_clandestine: bool = False,
    steps: int = 30,
    start_time: datetime | None = None,
) -> List[Dict[str, Any]]:
    """
    Generate realistic ADS-B state vector sequence.
    Normal: high altitude, regular speed, consistent vector.
    Clandestine: low altitude (< 1500 ft), variable heading, approaching border (Ring 2).
    """
    if start_time is None:
        start_time = datetime.now(timezone.utc)

    # Southern border coordinates (US-Mexico: lat 30.0 - 32.5, lon -116.0 - -100.0)
    if is_clandestine:
        # Originates in northern Mexico and heads north towards Texas/Arizona border
        lat = random.uniform(29.5, 30.5)
        lon = random.uniform(-111.0, -104.0)
        altitude_baro = random.uniform(400.0, 1200.0)  # Low altitude evasion
        velocity_knots = random.uniform(90.0, 140.0)
        heading_deg = random.uniform(340.0, 20.0) % 360.0
        vertical_rate = random.uniform(-2.0, 2.0)
        squawk = "1200" if random.random() > 0.4 else None  # Frequently transponder-off
    else:
        # Commercial / authorized airway transit
        lat = random.uniform(30.0, 33.0)
        lon = random.uniform(-115.0, -98.0)
        altitude_baro = random.uniform(18000.0, 36000.0)  # Standard flight levels
        velocity_knots = random.uniform(350.0, 480.0)
        heading_deg = random.uniform(60.0, 120.0)
        vertical_rate = 0.0
        squawk = f"{random.randint(1000, 7777)}"

    trajectory = []
    current_time = start_time

    for step in range(steps):
        # Time increment: 10 seconds per step
        current_time += timedelta(seconds=10)

        # Coordinate motion: ~1 knot is ~0.514 m/s. 1 deg lat is ~111,000 m.
        dist_deg = (velocity_knots * 0.514444 * 10) / 111000.0
        rad = math.radians(heading_deg)
        d_lat = dist_deg * math.cos(rad)
        d_lon = dist_deg * math.sin(rad) / max(math.cos(math.radians(lat)), 0.1)

        lat += d_lat
        lon += d_lon

        if is_clandestine:
            # Jitter heading and altitude to simulate low-level terrain masking
            heading_deg = (heading_deg + random.gauss(0, 5)) % 360.0
            altitude_baro = max(300.0, min(1800.0, altitude_baro + random.gauss(0, 30)))
            velocity_knots = max(70.0, min(170.0, velocity_knots + random.gauss(0, 3)))
        else:
            # Smooth cruise
            altitude_baro = max(15000.0, altitude_baro + vertical_rate * 10)

        trajectory.append({
            "callsign": callsign,
            "timestamp": int(current_time.timestamp()),
            "latitude": round(lat, 5),
            "longitude": round(lon, 5),
            "altitude_baro_ft": round(altitude_baro, 1),
            "velocity_knots": round(velocity_knots, 1),
            "heading_deg": round(heading_deg, 1),
            "vertical_rate": round(vertical_rate, 1),
            "squawk": squawk,
            "is_anomaly": 1 if is_clandestine else 0,
        })

    return trajectory


def generate_maritime_trajectory(
    mmsi: str,
    is_anomaly: bool = False,
    steps: int = 30,
    start_time: datetime | None = None,
) -> List[Dict[str, Any]]:
    """
    Generate realistic AIS vessel trajectory.
    Normal: consistent shipping corridor, steady speed over ground (SOG).
    Anomaly: dark ship (gap in signal), drifting/loitering (SOG < 2 knots in open sea), zig-zag.
    """
    if start_time is None:
        start_time = datetime.now(timezone.utc)

    # Gulf of Mexico coordinates (lat 24.0 - 28.5, lon -96.0 - -85.0)
    lat = random.uniform(24.5, 27.0)
    lon = random.uniform(-94.0, -88.0)

    if is_anomaly:
        sog_knots = random.uniform(1.0, 4.0)  # Loitering / ship-to-ship
        cog_deg = random.uniform(0.0, 360.0)
        vessel_type = "GO-FAST / UNMARKED"
    else:
        sog_knots = random.uniform(12.0, 20.0)  # Commercial tanker / cargo
        cog_deg = random.uniform(300.0, 340.0)  # Heading to Houston / New Orleans
        vessel_type = "CARGO / CONTAINER"

    trajectory = []
    current_time = start_time

    for step in range(steps):
        # Time increment: 60 seconds per step
        current_time += timedelta(seconds=60)

        dist_deg = (sog_knots * 0.514444 * 60) / 111000.0
        rad = math.radians(cog_deg)
        d_lat = dist_deg * math.cos(rad)
        d_lon = dist_deg * math.sin(rad) / max(math.cos(math.radians(lat)), 0.1)

        lat += d_lat
        lon += d_lon

        if is_anomaly:
            # Irregular maneuvers
            cog_deg = (cog_deg + random.gauss(0, 15)) % 360.0
            sog_knots = max(0.2, min(8.0, sog_knots + random.gauss(0, 0.8)))
            is_dark_ship = 1 if (step > 10 and step < 22) else 0
        else:
            is_dark_ship = 0

        trajectory.append({
            "mmsi": mmsi,
            "vessel_type": vessel_type,
            "timestamp": int(current_time.timestamp()),
            "latitude": round(lat, 5),
            "longitude": round(lon, 5),
            "sog_knots": round(sog_knots, 2),
            "cog_deg": round(cog_deg, 1),
            "is_dark_ship": is_dark_ship,
            "is_anomaly": 1 if is_anomaly else 0,
        })

    return trajectory


def generate_flight_dataset(num_samples: int = 500, anomaly_ratio: float = 0.2) -> List[List[Dict[str, Any]]]:
    """Generate balanced dataset of flight trajectories for Autoencoder training."""
    dataset = []
    for i in range(num_samples):
        is_clandestine = random.random() < anomaly_ratio
        callsign = f"ILLEGAL-{i:04d}" if is_clandestine else f"AAL{random.randint(100, 999)}"
        traj = generate_flight_trajectory(callsign=callsign, is_clandestine=is_clandestine, steps=25)
        dataset.append(traj)
    return dataset


def generate_maritime_dataset(num_samples: int = 500, anomaly_ratio: float = 0.2) -> List[List[Dict[str, Any]]]:
    """Generate balanced dataset of maritime trajectories for LSTM training."""
    dataset = []
    for i in range(num_samples):
        is_anomaly = random.random() < anomaly_ratio
        mmsi = f"999{random.randint(100000, 999999)}" if is_anomaly else f"367{random.randint(100000, 999999)}"
        traj = generate_maritime_trajectory(mmsi=mmsi, is_anomaly=is_anomaly, steps=25)
        dataset.append(traj)
    return dataset
