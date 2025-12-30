"""
Railway entry point - imports the actual app from backend directory
This file exists to help Railway detect Python and locate the application
"""
import sys
import os

# Add backend directory to Python path
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_dir)

# Import the actual Flask app from backend
# Backend config uses absolute paths based on __file__, so this works correctly
from app import app

# Export for gunicorn
__all__ = ['app']

