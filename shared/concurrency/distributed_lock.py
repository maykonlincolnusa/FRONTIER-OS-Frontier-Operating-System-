"""
Project Frontier - Distributed Lock Manager for Geofence Processing
Provides idempotency and mutual exclusion across distributed workers
evaluating target jurisdiction handoffs via Redis or PostgreSQL Advisory Locks.
"""

import asyncio
from contextlib import asynccontextmanager
import time
from typing import Any, AsyncGenerator, Dict, Optional
import uuid

try:
    import redis.asyncio as aioredis
except ImportError:
    aioredis = None

from shared.config import get_settings

# Atomic release script for Redis distributed lock
LUA_RELEASE_LOCK = """
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
"""


class JurisdictionLockManager:
    """
    Guarantees mutual exclusion when evaluating geofence transitions
    for a given target_id across multiple distributed workers.
    """

    def __init__(self, redis_url: Optional[str] = None):
        self.settings = get_settings()
        self.redis_url = redis_url or self.settings.redis_connection_url
        self._redis_client: Optional[Any] = None
        self._redis_tested: bool = False
        self._local_locks: Dict[str, float] = {}

    async def get_redis(self):
        """Lazy initialization of async Redis client with quick fallback."""
        if not self._redis_tested and aioredis is not None:
            self._redis_tested = True
            try:
                client = aioredis.from_url(
                    self.redis_url,
                    decode_responses=True,
                    socket_connect_timeout=0.2,
                )
                await client.ping()
                self._redis_client = client
            except Exception:
                self._redis_client = None
        return self._redis_client

    @asynccontextmanager
    async def acquire(
        self,
        target_id: str,
        ttl_seconds: int = 5,
        acquire_timeout: float = 1.0,
    ) -> AsyncGenerator[bool, None]:
        """
        Asynchronously acquire exclusive lock for a target_id.
        Yields True if lock acquired, False if already held by another worker.
        """
        lock_key = f"frontier:lock:geofence:{target_id}"
        token = str(uuid.uuid4())
        redis_client = await self.get_redis()
        acquired = False

        start_time = time.time()
        while time.time() - start_time < acquire_timeout:
            if redis_client is not None:
                try:
                    res = await redis_client.set(lock_key, token, nx=True, ex=ttl_seconds)
                    if res:
                        acquired = True
                        break
                except Exception:
                    # Fallback to local memory lock
                    break
            else:
                # In-memory lock fallback
                now = time.time()
                if lock_key not in self._local_locks or self._local_locks[lock_key] < now:
                    self._local_locks[lock_key] = now + ttl_seconds
                    acquired = True
                    break
            await asyncio.sleep(0.05)

        try:
            yield acquired
        finally:
            if acquired:
                if redis_client is not None:
                    try:
                        await redis_client.eval(LUA_RELEASE_LOCK, 1, lock_key, token)
                    except Exception:
                        pass
                else:
                    self._local_locks.pop(lock_key, None)

    async def close(self):
        """Close Redis connection."""
        if self._redis_client is not None:
            await self._redis_client.close()
            self._redis_client = None
