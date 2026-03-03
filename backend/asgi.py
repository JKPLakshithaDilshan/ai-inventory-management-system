"""
FastAPI application entry point for production deployment.

This file can be used with ASGI servers like uvicorn or gunicorn.
"""

from app.main import app

__all__ = ["app"]
