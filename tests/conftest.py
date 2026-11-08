"""
Pytest configuration for Frontier-OS test suite.
"""

import sys
import importlib.util
from pathlib import Path

# Ensure project root is in sys.path
_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

# Auto-resolve ml_training imports to the official ml-training/ directory
_ml_path = _root / "ml-training"
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

