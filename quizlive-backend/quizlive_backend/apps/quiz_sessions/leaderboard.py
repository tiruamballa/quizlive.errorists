"""
quiz_sessions/leaderboard.py

Additions over base version:
  - STREAK_KEY  : per-player consecutive correct count
  - POWERUP_KEY : per-player hash  {fifty_fifty, skip, double_active, double_used}
  - async_get_player_count   : zcard for live "X/Y answered" denominator
  - async_get_streak / async_increment_streak / async_reset_streak
  - async_get_powerups / async_use_powerup
  - async_activate_double / async_is_double_active / async_clear_double

Pipeline commands NOT awaited individually (redis-py 5.x).
"""
from typing import Optional
from services.redis_client import redis_conn, get_async_redis

BOARD_KEY   = lambda c:    f"game:{c}:leaderboard"
PLAYER_KEY  = lambda c:    f"game:{c}:players"
STREAK_KEY  = lambda c, p: f"game:{c}:player:{p}:streak"
POWERUP_KEY = lambda c, p: f"game:{c}:player:{p}:powerups"
TTL         = 60 * 60 * 4


def _b(v):
    return v.decode() if isinstance(v, bytes) else v


# ─── Sync ─────────────────────────────────────────────────────────────────────

def init_player(game_code, player_id, nickname):
    pipe = redis_conn.pipeline()
    pipe.hset(PLAYER_KEY(game_code), f"{player_id}:nickname", nickname)
    pipe.hset(PLAYER_KEY(game_code), f"{player_id}:score", "0")
    pipe.zadd(BOARD_KEY(game_code), {player_id: 0}, nx=True)
    pipe.set(STREAK_KEY(game_code, player_id), "0", ex=TTL)
    pipe.hset(POWERUP_KEY(game_code, player_id), mapping={
        "fifty_fifty":   "1",   # 1 = available,  0 = used
        "skip":          "1",   # 1 = available,  0 = used
        "double_active": "0",   # 0 = inactive,   1 = armed for next answer
        "double_used":   "0",   # 0 = never used, 1 = already activated once
    })
    pipe.expire(POWERUP_KEY(game_code, player_id), TTL)
    pipe.expire(BOARD_KEY(game_code),  TTL)
    pipe.expire(PLAYER_KEY(game_code), TTL)
    pipe.execute()


# ─── Async ────────────────────────────────────────────────────────────────────

async def async_init_player(game_code, player_id, nickname):
    r    = get_async_redis()
    pipe = r.pipeline()
    pipe.hset(PLAYER_KEY(game_code), f"{player_id}:nickname", nickname)
    pipe.hset(PLAYER_KEY(game_code), f"{player_id}:score", "0")
    pipe.zadd(BOARD_KEY(game_code), {player_id: 0}, nx=True)
    pipe.set(STREAK_KEY(game_code, player_id), "0", ex=TTL)
    pipe.hset(POWERUP_KEY(game_code, player_id), mapping={
        "fifty_fifty":   "1",
        "skip":          "1",
        "double_active": "0",
        "double_used":   "0",
    })
    pipe.expire(POWERUP_KEY(game_code, player_id), TTL)
    pipe.expire(BOARD_KEY(game_code),  TTL)
    pipe.expire(PLAYER_KEY(game_code), TTL)
    await pipe.execute()


async def async_add_score(game_code, player_id, delta):
    r         = get_async_redis()
    new_score = int(await r.zincrby(BOARD_KEY(game_code), delta, player_id))
    await r.hset(PLAYER_KEY(game_code), f"{player_id}:score", str(new_score))
    return new_score


async def async_get_top_n(game_code, n=10):
    r    = get_async_redis()
    raw  = await r.zrevrange(BOARD_KEY(game_code), 0, n - 1, withscores=True)
    meta = await r.hgetall(PLAYER_KEY(game_code))
    meta = {_b(k): _b(v) for k, v in meta.items()}
    return [
        {
            "rank":      rank,
            "player_id": _b(pid),
            "nickname":  meta.get(f"{_b(pid)}:nickname", "?"),
            "score":     int(score),
        }
        for rank, (pid, score) in enumerate(raw, start=1)
    ]


async def async_get_player_rank(game_code, player_id) -> Optional[int]:
    r    = get_async_redis()
    rank = await r.zrevrank(BOARD_KEY(game_code), player_id)
    return (rank + 1) if rank is not None else None


async def async_get_player_score(game_code, player_id) -> int:
    r     = get_async_redis()
    score = await r.zscore(BOARD_KEY(game_code), player_id)
    return int(score) if score is not None else 0


async def async_get_player_count(game_code) -> int:
    """Total players registered in this game (used as denominator for answer count)."""
    r = get_async_redis()
    return int(await r.zcard(BOARD_KEY(game_code)))


# ─── Streak ───────────────────────────────────────────────────────────────────

async def async_get_streak(game_code, player_id) -> int:
    r   = get_async_redis()
    val = await r.get(STREAK_KEY(game_code, player_id))
    return int(val) if val is not None else 0


async def async_increment_streak(game_code, player_id) -> int:
    """Increment and return the new streak value."""
    r = get_async_redis()
    return int(await r.incr(STREAK_KEY(game_code, player_id)))


async def async_reset_streak(game_code, player_id):
    """Reset streak to 0 on wrong answer."""
    r = get_async_redis()
    await r.set(STREAK_KEY(game_code, player_id), "0")


# ─── Power-ups ────────────────────────────────────────────────────────────────

async def async_get_powerups(game_code, player_id) -> dict:
    """
    Returns availability dict:
      { fifty_fifty: bool, skip: bool, double_active: bool, double_used: bool }
    """
    r   = get_async_redis()
    raw = await r.hgetall(POWERUP_KEY(game_code, player_id))
    if not raw:
        # Default: all available, double not yet armed
        return {"fifty_fifty": True, "skip": True, "double_active": False, "double_used": False}
    d = {_b(k): _b(v) for k, v in raw.items()}
    return {
        "fifty_fifty":   d.get("fifty_fifty",   "1") == "1",
        "skip":          d.get("skip",           "1") == "1",
        "double_active": d.get("double_active",  "0") == "1",
        "double_used":   d.get("double_used",    "0") == "1",
    }


async def async_use_powerup(game_code, player_id, powerup_type: str) -> bool:
    """
    Atomically consume a one-shot power-up (fifty_fifty or skip).
    Returns True if successfully consumed, False if already used.
    """
    if powerup_type not in ("fifty_fifty", "skip"):
        return False
    r       = get_async_redis()
    current = await r.hget(POWERUP_KEY(game_code, player_id), powerup_type)
    current = _b(current) if current is not None else "0"
    if current != "1":
        return False
    await r.hset(POWERUP_KEY(game_code, player_id), powerup_type, "0")
    return True


async def async_activate_double(game_code, player_id) -> bool:
    """
    Arm double-points for the next correct answer.
    Returns False if already used (double_used == "1") — one per game.
    """
    r   = get_async_redis()
    raw = await r.hgetall(POWERUP_KEY(game_code, player_id))
    d   = {_b(k): _b(v) for k, v in (raw or {}).items()}
    if d.get("double_used", "0") == "1":
        return False
    pipe = r.pipeline()
    pipe.hset(POWERUP_KEY(game_code, player_id), "double_active", "1")
    pipe.hset(POWERUP_KEY(game_code, player_id), "double_used",   "1")
    await pipe.execute()
    return True


async def async_is_double_active(game_code, player_id) -> bool:
    """Returns True if double-points is armed and waiting to fire."""
    r   = get_async_redis()
    val = await r.hget(POWERUP_KEY(game_code, player_id), "double_active")
    return _b(val) == "1" if val is not None else False


async def async_clear_double(game_code, player_id):
    """Disarm double-points after it has been applied to an answer."""
    r = get_async_redis()
    await r.hset(POWERUP_KEY(game_code, player_id), "double_active", "0")