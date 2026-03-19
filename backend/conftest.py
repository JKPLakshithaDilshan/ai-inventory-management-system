"""Pytest configuration and fixtures.

This file ensures that the backend package is in the Python path
so that tests can properly import app modules.
"""

import sys
from pathlib import Path

# Add backend directory to Python path for imports
backend_dir = Path(__file__).parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
