"""
Railway entry point - imports the actual app from backend directory
This file exists to help Railway detect Python and locate the application
"""
import sys
import os
import importlib.util

# Get the root directory (where this file is located)
root_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(root_dir, 'backend')

# Change to root directory to ensure relative paths work correctly
os.chdir(root_dir)

# Import the backend app.py directly using importlib to avoid circular import
backend_app_path = os.path.join(backend_dir, 'app.py')
spec = importlib.util.spec_from_file_location("backend_app", backend_app_path)
backend_app_module = importlib.util.module_from_spec(spec)

try:
    spec.loader.exec_module(backend_app_module)
    app = backend_app_module.app
except Exception as e:
    import traceback
    print(f"Error importing backend app: {e}")
    traceback.print_exc()
    raise

# Export for gunicorn
__all__ = ['app']

