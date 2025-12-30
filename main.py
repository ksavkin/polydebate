"""
Railway Railpack entry point - imports from app.py
Railpack auto-detects main:app, so this file satisfies that requirement
"""
from app import app

__all__ = ['app']

