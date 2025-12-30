"""
Railway entry point - imports the actual app from backend directory
This file exists to help Railway detect Python and locate the application
"""
import sys
import os

# Get the root directory (where this file is located)
root_dir = os.path.dirname(os.path.abspath(__file__))

# Add backend directory to Python path
backend_dir = os.path.join(root_dir, 'backend')
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Change to root directory to ensure relative paths work correctly
os.chdir(root_dir)

# Import the actual Flask app from backend
# Backend config uses absolute paths based on __file__, so this works correctly
try:
    from app import app
except Exception as e:
    import traceback
    print(f"Error importing backend app: {e}")
    traceback.print_exc()
    raise

# Export for gunicorn
__all__ = ['app']

