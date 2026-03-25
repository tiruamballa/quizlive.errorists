"""
quiz_sessions/consumers.py

Additions over base version:
  - powerup.use handler  → 50/50 / double_points / skip
  - Streak tracking in _handle_answer_submit (increment on correct, reset on wrong)
  - Double-points flag applied in _handle_answer_submit then cleared
  - Live answer count broadcast (answer.count) after every submission
  - answer.ack now includes: streak, streak_multiplier, double_used, response_time
  - self.skipped_question_id tracks in-memory whether this player skipped current Q
"""
import asyncio
import json
import logging
import time
from typing import Optional

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser

from . import game_engine, leaderboard
from .scoring import calculate_score, get_streak_multiplier

logger = logging.getLogger(__name__)

QUESTION_BUFFER_SECS = 2.0
RATE_LIMIT_WINDOW    = 0.5


def _group(code):
    return f"game_{code}"


class GameConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.game_code           = self.scope["url_route"]["kwargs"]["game_code"].upper()
        self.group_name          = _group(self.game_code)
        self.user                = self.scope.get("user", AnonymousUser())
        self.player_id: Optional[str]  = None
        self.nickname:  Optional[str]  = None
        self.is_host:   bool           = False
        self.last_answer_ts: float     = 0.0
        self._in_group: bool           = False
        # Tracks which question_id this player skipped (in-memory, reset on new Q)
        self.skipped_question_id: Optional[str] = None

        await self.accept()

        session = await game_engine.async_get_session(self.game_code)
        if not session:
            await self._send("error", {"message": "Game not found. Check the code and try again."})
            await self.close(code=4004)
            return

        # ── is_host: JWT must match host_id AND ?host=1 must be in query string ──
        is_anon       = isinstance(self.user, AnonymousUser)
        is_auth       = not is_anon and self.user.is_authenticated
        host_id_redis = session.get("host_id", "")
        my_id         = str(self.user.id) if is_auth else "anonymous"
        query_string  = self.scope.get("query_string", b"").decode()
        is_host_flag  = "host=1" in query_string

        logger.info(
            "WS connect: game=%s is_auth=%s my_id=%s host_id=%s host_flag=%s",
            self.game_code, is_auth, my_id, host_id_redis, is_host_flag,
        )

        if is_auth and my_id == host_id_redis and is_host_flag:
            self.is_host = True
            logger.info("WS connect: is_host=True for user=%s", self.user.username)
        else:
            logger.info(
                "WS connect: is_host=False | is_auth=%s | id_match=%s | host_flag=%s",
                is_auth, (my_id == host_id_redis), is_host_flag,
            )

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        self._in_group = True

        await self._send("connected", {
            "game_code": self.game_code,
            "status":    session.get("status", "lobby"),
            "is_host":   self.is_host,
        })

    async def disconnect(self, close_code):
        if self.player_id and self.nickname and self._in_group:
            try:
                await self._broadcast("player.left", {
                    "player_id": self.player_id,
                    "nickname":  self.nickname,
                })
            except Exception:
                pass
        if self._in_group:
            try:
                await self.channel_layer.group_discard(self.group_name, self.channel_name)
            except Exception:
                pass
        logger.info("WS disconnect: game=%s code=%s", self.game_code, close_code)

    async def receive(self, text_data):
        try:
            msg = json.loads(text_data)
        except (json.JSONDecodeError, ValueError):
            await self._error("Invalid JSON.")
            return

        event_type = msg.get("type", "")
        payload    = msg.get("payload", {})

        handlers = {
            "player.join":   self._handle_player_join,
            "answer.submit": self._handle_answer_submit,
            "game.start":    self._handle_game_start,
            "game.end":      self._handle_game_end,
            "powerup.use":   self._handle_powerup_use,
        }
        handler = handlers.get(event_type)
        if handler:
            try:
                await handler(payload)
            except Exception as exc:
                logger.exception("Handler '%s' raised: %s", event_type, exc)
                await self._error("Internal server error.")
        else:
            await self._error(f"Unknown event type: '{event_type}'.")

    # ─── Player join ────────────────────────────────────────────────────────

    async def _handle_player_join(self, payload):
        session = await game_engine.async_get_session(self.game_code)
        if not session:
            await self._error("Game session not found.")
            return
        if session.get("status") == "finished":
            await self._error("This game has already ended.")
            return

        is_anon = isinstance(self.user, AnonymousUser)
        is_auth = not is_anon and self.user.is_authenticated

        if is_auth:
            user_id  = str(self.user.id)
            nickname = (payload.get("nickname") or "").strip() or self.user.username
        else:
            user_id  = None
            nickname = (payload.get("nickname") or "").strip()
            if not nickname:
                await self._error("nickname is required.")
                return
            if len(nickname) > 30:
                await self._error("nickname must be 30 characters or fewer.")
                return

        try:
            ps = await self._get_or_create_player_session(user_id, nickname)
        except Exception as exc:
            logger.exception("player session creation failed: %s", exc)
            await self._error("Could not register player — please try again.")
            return

        self.player_id = str(ps.id)
        self.nickname  = ps.nickname

        # Host should NOT appear in the player lobby list
        if self.is_host:
            await self._send("join.confirmed", {
                "player_id": self.player_id,
                "nickname":  self.nickname,
                "is_host":   True,
            })
            logger.info("player.join (host): game=%s nickname=%s", self.game_code, self.nickname)
            return

        # Init leaderboard entry + streak + powerups in Redis
        await leaderboard.async_init_player(self.game_code, self.player_id, self.nickname)

        await self._send("join.confirmed", {
            "player_id": self.player_id,
            "nickname":  self.nickname,
            "is_host":   self.is_host,
        })

        players = await leaderboard.async_get_top_n(self.game_code, n=100)
        await self._broadcast("lobby.updated", {"players": players})

        logger.info("player.join: game=%s nickname=%s is_host=%s",
                    self.game_code, self.nickname, self.is_host)

    # ─── Game start ─────────────────────────────────────────────────────────

    async def _handle_game_start(self, payload):
        logger.info("game.start received: game=%s is_host=%s", self.game_code, self.is_host)

        if not self.is_host:
            await self._error("Only the host can start the game.")
            return

        session = await game_engine.async_get_session(self.game_code)
        if not session or session.get("status") != "lobby":
            await self._error("Game has already started or finished.")
            return

        questions = await game_engine.async_get_questions(self.game_code)
        if not questions:
            await self._error("No questions found — check quiz setup.")
            return

        await game_engine.async_set_session_status(self.game_code, "active")
        await self._update_db_session_status("active")

        await self._broadcast("game.started", {
            "game_code":       self.game_code,
            "total_questions": len(questions),
        })

        asyncio.create_task(self._run_question_loop(questions))
        logger.info("game.start: game=%s questions=%d", self.game_code, len(questions))

    # ─── Question loop ───────────────────────────────────────────────────────

    async def _run_question_loop(self, questions):
        total = len(questions)
        for idx, q in enumerate(questions):
            # Reset skipped state for this new question (all connections)
            # Note: each consumer instance has its own self.skipped_question_id
            start_ts = time.time()
            deadline = start_ts + q["time_limit_secs"]

            await game_engine.async_advance_question(self.game_code, idx, start_ts, deadline)

            # Snapshot player count so host sees accurate denominator
            player_count = await leaderboard.async_get_player_count(self.game_code)

            await self._broadcast("question.new", {
                "question_id":     q["id"],
                "question_index":  idx,
                "index":           idx,
                "total":           total,
                "text":            q["text"],
                "question_type":   q["question_type"],
                "difficulty":      q["difficulty"],
                "options":         q["options"],
                "time_limit":      q["time_limit_secs"],
                "time_limit_secs": q["time_limit_secs"],
                "base_points":     q["base_points"],
                "deadline_ts":     deadline,
                "total_players":   player_count,
            })

            await asyncio.sleep(q["time_limit_secs"] + QUESTION_BUFFER_SECS)

            correct_option_id = await game_engine.async_get_correct_option(
                self.game_code, q["id"]
            )
            stats     = await game_engine.async_get_question_stats(self.game_code, q["id"])
            top_board = await leaderboard.async_get_top_n(self.game_code, n=10)

            await self._broadcast("question.ended", {
                "question_id": q["id"],
                "correct_ids": [correct_option_id] if correct_option_id else [],
                "stats":       stats,
                "leaderboard": top_board,
            })

            await asyncio.sleep(3)

        await self._end_game()

    # ─── Answer submit ───────────────────────────────────────────────────────

    async def _handle_answer_submit(self, payload):
        if not self.player_id:
            await self._error("Join the game before submitting answers.")
            return

        now = time.time()
        if now - self.last_answer_ts < RATE_LIMIT_WINDOW:
            await self._error("Too many submissions — slow down.")
            return
        self.last_answer_ts = now

        question_id = payload.get("question_id")
        option_id   = payload.get("option_id")
        if not question_id or not option_id:
            await self._error("question_id and option_id are required.")
            return

        # Block if this player used Skip on the current question
        if self.skipped_question_id == str(question_id):
            await self._error("You skipped this question.")
            return

        session = await game_engine.async_get_session(self.game_code)
        if not session or session.get("status") != "active":
            await self._error("Game is not currently active.")
            return

        deadline_ts = float(session.get("question_deadline", 0))
        if time.time() > deadline_ts + 0.5:
            await self._error("Time's up — answer not accepted.")
            return

        questions = await game_engine.async_get_questions(self.game_code)
        q_index   = int(session.get("current_q_index", 0))
        if q_index < 0 or q_index >= len(questions):
            await self._error("No active question.")
            return
        current_q = questions[q_index]

        start_ts = float(session.get("question_start_ts",
                                     deadline_ts - current_q["time_limit_secs"]))
        elapsed  = max(0.1, min(time.time() - start_ts, current_q["time_limit_secs"]))

        correct_option_id = await game_engine.async_get_correct_option(
            self.game_code, question_id
        )
        is_correct = bool(correct_option_id and str(option_id) == str(correct_option_id))

        # ── Pre-fetch streak + double state for score calculation ────────────
        # We read current streak and project the new value so we can calculate
        # points before recording. The actual Redis update happens AFTER the
        # duplicate-answer guard so a duplicate submit never corrupts state.
        double_active   = await leaderboard.async_is_double_active(
            self.game_code, self.player_id
        )
        current_streak  = await leaderboard.async_get_streak(
            self.game_code, self.player_id
        )
        projected_streak = (current_streak + 1) if is_correct else 0

        points = calculate_score(
            base_points=current_q["base_points"],
            difficulty=current_q["difficulty"],
            response_time=elapsed,
            time_limit=current_q["time_limit_secs"],
            streak=projected_streak,
            double_points=double_active and is_correct,
        ) if is_correct else 0

        # ── Record answer atomically — this is the idempotency guard ─────────
        # IMPORTANT: streak / double Redis updates happen AFTER this check so
        # a duplicate submission never corrupts per-player state.
        recorded = await game_engine.async_record_answer(
            game_code=self.game_code, question_id=question_id,
            player_id=self.player_id, option_id=str(option_id),
            response_time=elapsed, points=points, is_correct=is_correct,
        )
        if not recorded:
            await self._error("You already answered this question.")
            return

        # ── Apply streak + double updates (only reached on first submission) ──
        if is_correct:
            new_streak = await leaderboard.async_increment_streak(
                self.game_code, self.player_id
            )
            if double_active:
                # Clear double whether correct or wrong — it fires on this answer
                await leaderboard.async_clear_double(self.game_code, self.player_id)
        else:
            new_streak = 0
            await leaderboard.async_reset_streak(self.game_code, self.player_id)
            if double_active:
                # Bug fix: also clear double on wrong answer so it doesn't
                # carry over to a future question
                await leaderboard.async_clear_double(self.game_code, self.player_id)

        streak_multiplier = get_streak_multiplier(new_streak) if is_correct else 1.0
        double_used       = double_active and is_correct
        # ────────────────────────────────────────────────────────────────────

        new_score = (
            await leaderboard.async_add_score(self.game_code, self.player_id, points)
            if points > 0
            else await leaderboard.async_get_player_score(self.game_code, self.player_id)
        )
        new_rank = await leaderboard.async_get_player_rank(self.game_code, self.player_id)

        # ── Persist answer to DB ─────────────────────────────────────────────
        await self._save_answer_to_db(
            question_id=question_id,
            option_id=str(option_id),
            response_time=elapsed,
            points=points,
            is_correct=is_correct,
        )

        # ── Acknowledge to submitting player ─────────────────────────────────
        await self._send("answer.ack", {
            "question_id":       question_id,
            "is_correct":        is_correct,
            "points":            points,
            "points_awarded":    points,          # backwards compat
            "total_score":       new_score,
            "rank":              new_rank,
            "streak":            new_streak,
            "streak_multiplier": streak_multiplier,
            "double_used":       double_used,
            "response_time":     round(elapsed, 2),
        })

        # ── Live answer count → host sees "X/Y answered" ─────────────────────
        player_count = await leaderboard.async_get_player_count(self.game_code)
        answer_count = await game_engine.async_increment_answer_count(
            self.game_code, question_id
        )
        await self._broadcast("answer.count", {
            "question_id": question_id,
            "answered":    answer_count,
            "total":       player_count,
        })

        # ── Leaderboard push to all ───────────────────────────────────────────
        top = await leaderboard.async_get_top_n(self.game_code, n=10)
        await self._broadcast("leaderboard.update", {"rankings": top})

    # ─── Power-up use ────────────────────────────────────────────────────────

    async def _handle_powerup_use(self, payload):
        if not self.player_id:
            await self._error("Join the game before using power-ups.")
            return

        powerup_type = payload.get("type")
        if powerup_type not in ("fifty_fifty", "double_points", "skip"):
            await self._error(f"Unknown power-up type: '{powerup_type}'.")
            return

        session = await game_engine.async_get_session(self.game_code)
        if not session or session.get("status") != "active":
            await self._error("Power-ups can only be used during an active question.")
            return

        q_index   = int(session.get("current_q_index", -1))
        questions = await game_engine.async_get_questions(self.game_code)
        if q_index < 0 or q_index >= len(questions):
            await self._error("No active question.")
            return
        current_q   = questions[q_index]
        question_id = current_q["id"]

        # ── 50/50: hide 2 wrong options ──────────────────────────────────────
        if powerup_type == "fifty_fifty":
            consumed = await leaderboard.async_use_powerup(
                self.game_code, self.player_id, "fifty_fifty"
            )
            if not consumed:
                await self._error("50/50 already used.")
                return
            hide_ids = await game_engine.async_get_wrong_options_for_5050(
                self.game_code, question_id
            )
            await self._send("powerup.result", {
                "type":            "fifty_fifty",
                "hide_option_ids": hide_ids,
            })
            logger.info("powerup 50/50: game=%s player=%s q=%s hide=%s",
                        self.game_code, self.player_id, question_id, hide_ids)

        # ── Double points: arm flag for next correct answer ──────────────────
        elif powerup_type == "double_points":
            activated = await leaderboard.async_activate_double(
                self.game_code, self.player_id
            )
            if not activated:
                await self._error("Double Points already used.")
                return
            await self._send("powerup.result", {
                "type":   "double_points",
                "active": True,
            })
            logger.info("powerup double: game=%s player=%s ARMED", self.game_code, self.player_id)

        # ── Skip: mark this question as skipped for this connection ──────────
        elif powerup_type == "skip":
            consumed = await leaderboard.async_use_powerup(
                self.game_code, self.player_id, "skip"
            )
            if not consumed:
                await self._error("Skip already used.")
                return
            self.skipped_question_id = question_id
            await self._send("powerup.result", {
                "type":        "skip",
                "question_id": question_id,
            })
            logger.info("powerup skip: game=%s player=%s q=%s",
                        self.game_code, self.player_id, question_id)

    # ─── Game end ────────────────────────────────────────────────────────────

    async def _handle_game_end(self, payload):
        if not self.is_host:
            await self._error("Only the host can end the game.")
            return
        await self._end_game()

    async def _end_game(self):
        await game_engine.async_set_session_status(self.game_code, "finished")
        final_board = await leaderboard.async_get_top_n(self.game_code, n=100)
        await self._flush_final_scores(final_board)
        await self._update_db_session_status("finished")
        await self._broadcast("game.ended", {
            "podium": final_board[:3],
            "all":    final_board,
        })
        logger.info("game.ended: game=%s players=%d", self.game_code, len(final_board))
        asyncio.create_task(self._deferred_cleanup())

    async def _deferred_cleanup(self):
        await asyncio.sleep(120)
        await game_engine.async_cleanup_game(self.game_code)

    # ─── DB helpers ──────────────────────────────────────────────────────────

    @database_sync_to_async
    def _get_or_create_player_session(self, user_id, nickname):
        from .models import GameSession, PlayerSession
        from django.contrib.auth import get_user_model
        User = get_user_model()
        gs   = GameSession.objects.get(game_code=self.game_code)
        user = None
        if user_id:
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                pass
        ps, _ = PlayerSession.objects.get_or_create(
            game_session=gs, nickname=nickname, defaults={"user": user}
        )
        return ps

    @database_sync_to_async
    def _update_db_session_status(self, status_val):
        from .models import GameSession
        from django.utils import timezone
        updates = {"status": status_val}
        if status_val == "active":
            updates["started_at"] = timezone.now()
        elif status_val == "finished":
            updates["ended_at"] = timezone.now()
        GameSession.objects.filter(game_code=self.game_code).update(**updates)

    @database_sync_to_async
    def _flush_final_scores(self, final_board):
        from .models import PlayerSession
        for entry in final_board:
            PlayerSession.objects.filter(id=entry["player_id"]).update(
                final_score=entry["score"],
                final_rank=entry["rank"],
            )

    @database_sync_to_async
    def _save_answer_to_db(self, question_id, option_id, response_time, points, is_correct):
        from .models import PlayerSession, PlayerAnswer
        from apps.quizzes.models import Question, AnswerOption
        try:
            ps       = PlayerSession.objects.get(id=self.player_id)
            question = Question.objects.get(id=question_id)
            option   = None
            try:
                option = AnswerOption.objects.get(id=option_id)
            except (AnswerOption.DoesNotExist, Exception):
                pass
            PlayerAnswer.objects.update_or_create(
                player_session=ps,
                question=question,
                defaults={
                    "selected_option": option,
                    "is_correct":      is_correct,
                    "response_time":   round(response_time, 3),
                    "points_awarded":  points,
                },
            )
        except Exception as exc:
            logger.warning("_save_answer_to_db failed: %s", exc)

    # ─── Send helpers ────────────────────────────────────────────────────────

    async def _send(self, event_type, payload):
        await self.send(text_data=json.dumps({"type": event_type, "payload": payload}))

    async def _broadcast(self, event_type, payload):
        await self.channel_layer.group_send(
            self.group_name,
            {"type": "game_message", "event_type": event_type, "payload": payload},
        )

    async def game_message(self, event):
        await self.send(text_data=json.dumps({
            "type":    event["event_type"],
            "payload": event["payload"],
        }))

    async def _error(self, message):
        await self._send("error", {"message": message})