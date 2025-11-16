"""
Simple in-memory cache with TTL
"""
import time
from typing import Any, Optional


class SimpleCache:
    """Simple in-memory cache with TTL support"""

    def __init__(self):
        self._cache = {}

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if key not in self._cache:
            return None

        value, expiry = self._cache[key]

        # Check if expired
        if expiry and time.time() > expiry:
            del self._cache[key]
            return None

        return value

    def set(self, key: str, value: Any, ttl: int = None):
        """Set value in cache with optional TTL (in seconds)"""
        expiry = time.time() + ttl if ttl else None
        self._cache[key] = (value, expiry)

    def delete(self, key: str):
        """Delete value from cache"""
        if key in self._cache:
            del self._cache[key]

    def clear(self):
        """Clear all cache"""
        self._cache.clear()


# Global cache instance
cache = SimpleCache()
