"""
quiz_sessions/game_engine.py

Additions over base version:
  - ANSWER_COUNT_KEY : per-question answer submission counter
  - async_increment_answer_count  → int  (for live "X/Y answered" broadcast)
  - async_get_answer_count        → int
  - async_get_wrong_options_for_5050 → list[str]  (2 wrong option IDs for 50/50 power-up)

All bytes decoded to str consistently.
Pipeline commands never awaited individually (redis-py 5.x).
question_start_ts stored alongside question_deadline.
"""
import json
import logging
import random
from typing import Optional

from services.redis_client import get_async_redis, redis_conn

logger = logging.getLogger(__name__)

GAME_CODE_TTL    = 60 * 60 * 4

SESSION_KEY      = lambda c:    f"game:{c}:session"
QUESTION_KEY     = lambda c:    f"game:{c}:questions"
QANSWERS_KEY     = lambda c:    f"game:{c}:qanswers"
ANSWER_KEY       = lambda c, q: f"game:{c}:q:{q}:answers"
STATS_KEY        = lambda c, q: f"game:{c}:q:{q}:stats"
ANSWER_COUNT_KEY = lambda c, q: f"game:{c}:q:{q}:answer_count"
GAMECODE_KEY     = lambda c:    f"gamecode:{c}"


def _b(v):
    """Decode bytes to str if needed."""
    return v.decode() if isinstance(v, bytes) else v


# ─── Sync (REST views) ────────────────────────────────────────────────────────

def create_session_in_redis(session_id, game_code, quiz_id, host_id):
    pipe = redis_conn.pipeline()
    pipe.hset(SESSION_KEY(game_code), mapping={
        "session_id":        session_id,
        "quiz_id":           quiz_id,
        "host_id":           host_id,
        "status":            "lobby",
        "current_q_index":   "-1",
        "total_questions":   "0",
        "question_deadline": "0",
        "question_start_ts": "0",
    })
    pipe.set(GAMECODE_KEY(game_code), session_id, ex=GAME_CODE_TTL)
    pipe.expire(SESSION_KEY(game_code), GAME_CODE_TTL)
    pipe.execute()


def cache_questions_in_redis(game_code, questions):
    questions_data = []
    pipe = redis_conn.pipeline()
    for q in questions:
        opts    = list(q.options.all())
        correct = next((o for o in opts if o.is_correct), None)
        q_data  = {
            "id":              str(q.id),
            "text":            q.text,
            "question_type":   q.question_type,
            "difficulty":      q.difficulty,
            "time_limit_secs": q.time_limit_secs,
            "base_points":     q.base_points,
            "order":           q.order,
            "options":         [{"id": str(o.id), "text": o.text, "order": o.order} for o in opts],
            "correct_option_id": str(correct.id) if correct else None,
        }
        questions_data.append(q_data)
        if correct:
            pipe.hset(QANSWERS_KEY(game_code), str(q.id), str(correct.id))
    pipe.set(QUESTION_KEY(game_code), json.dumps(questions_data))
    pipe.hset(SESSION_KEY(game_code), "total_questions", str(len(questions_data)))
    pipe.execute()


def get_session_status(game_code):
    val = redis_conn.hget(SESSION_KEY(game_code), "status")
    return _b(val) if val is not None else None


# ─── Async (consumers) ───────────────────────────────────────────────────────

async def async_get_session(game_code):
    r    = get_async_redis()
    data = await r.hgetall(SESSION_KEY(game_code))
    return {_b(k): _b(v) for k, v in data.items()}


async def async_set_session_status(game_code, status_val):
    r = get_async_redis()
    await r.hset(SESSION_KEY(game_code), "status", status_val)


async def async_get_questions(game_code):
    r   = get_async_redis()
    raw = await r.get(QUESTION_KEY(game_code))
    if not raw:
        return []
    return json.loads(_b(raw))


async def async_get_correct_option(game_code, question_id):
    r   = get_async_redis()
    val = await r.hget(QANSWERS_KEY(game_code), question_id)
    return _b(val) if val is not None else None


async def async_advance_question(game_code, new_index, start_ts, deadline_ts):
    r = get_async_redis()
    await r.hset(SESSION_KEY(game_code), mapping={
        "current_q_index":   str(new_index),
        "question_start_ts": str(start_ts),
        "question_deadline": str(deadline_ts),
    })


async def async_record_answer(game_code, question_id, player_id,
                               option_id, response_time, points, is_correct):
    r       = get_async_redis()
    payload = json.dumps({
        "option_id":     option_id,
        "response_time": response_time,
        "points":        points,
        "is_correct":    is_correct,
    })
    recorded = await r.hsetnx(ANSWER_KEY(game_code, question_id), player_id, payload)
    if recorded:
        pipe = r.pipeline()
        pipe.hincrby(STATS_KEY(game_code, question_id), "total_count", 1)
        if is_correct:
            pipe.hincrby(STATS_KEY(game_code, question_id), "correct_count", 1)
        await pipe.execute()
    return bool(recorded)


async def async_get_question_stats(game_code, question_id):
    r     = get_async_redis()
    stats = await r.hgetall(STATS_KEY(game_code, question_id))
    norm  = {_b(k): _b(v) for k, v in stats.items()}
    return {
        "total_count":   int(norm.get("total_count", 0)),
        "correct_count": int(norm.get("correct_count", 0)),
    }


# ─── Answer count (live "X/Y answered" for host) ─────────────────────────────

async def async_increment_answer_count(game_code, question_id) -> int:
    """
    Atomically increment the answer counter for this question.
    Returns the new count (used immediately for broadcast).
    """
    r     = get_async_redis()
    key   = ANSWER_COUNT_KEY(game_code, question_id)
    count = int(await r.incr(key))
    await r.expire(key, GAME_CODE_TTL)
    return count


async def async_get_answer_count(game_code, question_id) -> int:
    r   = get_async_redis()
    val = await r.get(ANSWER_COUNT_KEY(game_code, question_id))
    return int(val) if val is not None else 0


# ─── 50/50 power-up helper ───────────────────────────────────────────────────

async def async_get_wrong_options_for_5050(game_code, question_id) -> list:
    """
    Return exactly 2 wrong option IDs to hide for the 50/50 power-up.
    If fewer than 2 wrong options exist, returns all of them.
    """
    questions = await async_get_questions(game_code)
    correct   = await async_get_correct_option(game_code, question_id)
    q         = next((q for q in questions if q["id"] == question_id), None)
    if not q or not correct:
        return []
    wrong = [o["id"] for o in q["options"] if o["id"] != correct]
    if len(wrong) <= 2:
        return wrong
    return random.sample(wrong, 2)


# ─── Cleanup ─────────────────────────────────────────────────────────────────

async def async_cleanup_game(game_code):
    r      = get_async_redis()
    cursor = 0
    while True:
        cursor, keys = await r.scan(cursor, match=f"game:{game_code}:*", count=100)
        if keys:
            await r.delete(*keys)
        if cursor == 0:
            break
    await r.delete(GAMECODE_KEY(game_code))