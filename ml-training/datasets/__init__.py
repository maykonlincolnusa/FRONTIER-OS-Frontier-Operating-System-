"""
Project Frontier - Datasets and Public API Clients Module
"""

from ml-training.datasets.fbi_client import FBIWantedClient, FBIWantedPerson
from ml-training.datasets.opensky_client import OpenSkyClient, OpenSkyStateVector
from ml-training.datasets.synthetic_generator import (
    generate_flight_dataset,
    generate_flight_trajectory,
    generate_maritime_dataset,
    generate_maritime_trajectory,
)

__all__ = [
    "FBIWantedClient",
    "FBIWantedPerson",
    "OpenSkyClient",
    "OpenSkyStateVector",
    "generate_flight_dataset",
    "generate_flight_trajectory",
    "generate_maritime_dataset",
    "generate_maritime_trajectory",
]
