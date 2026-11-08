"""
Project Frontier - Shared Core Library
Provides schemas, configurations, and geospatial utilities across all C4ISR subsystems.
"""

import sys
import importlib.util
from pathlib import Path

__version__ = "0.1.0"

# Auto-resolve ml_training imports to the official ml-training/ directory
_ml_path = Path(__file__).resolve().parent.parent / "ml-training"
if _ml_path.exists() and "ml_training" not in sys.modules:
    _spec = importlib.util.spec_from_file_location(
        "ml_training",
        _ml_path / "__init__.py",
        submodule_search_locations=[str(_ml_path)],
    )
    if _spec and _spec.loader:
        _mod = importlib.util.module_from_spec(_spec)
        sys.modules["ml_training"] = _mod
        _spec.loader.exec_module(_mod)
