"""6-character alphanumeric game code generator."""
import random

_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
GAME_CODE_LENGTH = 6
GAME_CODE_TTL = 60 * 60 * 4  # 4 hours


def generate_code() -> str:
    return "".join(random.choices(_ALPHABET, k=GAME_CODE_LENGTH))


def generate_unique_code(max_attempts: int = 10) -> str:
    """Generate a code not currently active in Redis."""
    from services.redis_client import redis_conn
    for _ in range(max_attempts):
        code = generate_code()
        if not redis_conn.exists(f"gamecode:{code}"):
            return code
    raise RuntimeError("Failed to generate a unique game code — try again.")
