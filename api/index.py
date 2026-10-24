import sys
import os
from pathlib import Path

# Add project root directory to sys.path so 'app' package is fully importable
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Import the FastAPI application instance
from app.main import app

# Export ASGI app instance for Vercel Serverless Functions
app = app
