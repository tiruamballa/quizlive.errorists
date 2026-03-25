"""Central Redis client — single connection pool shared across the project."""
import redis
import redis.asyncio as aioredis
from django.conf import settings

redis_conn: redis.Redis = redis.Redis.from_url(
    getattr(settings, "REDIS_URL", "redis://localhost:6379/0"),
    decode_responses=True,
    socket_connect_timeout=5,
    socket_keepalive=True,
)

_async_pool = None


def get_async_redis() -> aioredis.Redis:
    """Return (or lazily create) the async Redis connection."""
    global _async_pool
    if _async_pool is None:
        _async_pool = aioredis.ConnectionPool.from_url(
            getattr(settings, "REDIS_URL", "redis://localhost:6379/0"),
            decode_responses=True,
            max_connections=50,
        )
    return aioredis.Redis(connection_pool=_async_pool)
