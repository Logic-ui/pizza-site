"""
Root entry point allowing:
  python -m uvicorn main:app --reload
from the project root directory, delegating directly to app.main.
"""
from app.main import app

__all__ = ["app"]
