"""
Project Frontier - Machine Learning & Deep Learning Training Package
"""

import sys
from pathlib import Path

# Add ml-training submodules to sys.path
_root = Path(__file__).resolve().parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))
