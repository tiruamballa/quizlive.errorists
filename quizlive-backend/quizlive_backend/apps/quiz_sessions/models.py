"""
Models for quiz_sessions app.
GameSession  — one hosted game (code, quiz, host, status)
PlayerSession — one player's participation in a game
PlayerAnswer  — one player's answer to one question
"""
import uuid
from django.conf import settings
from django.db import models


class GameSession(models.Model):
    STATUS_LOBBY    = "lobby"
    STATUS_ACTIVE   = "active"
    STATUS_FINISHED = "finished"
    STATUS_CHOICES  = [
        (STATUS_LOBBY,    "Lobby"),
        (STATUS_ACTIVE,   "Active"),
        (STATUS_FINISHED, "Finished"),
    ]

    id        = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz      = models.ForeignKey(
        "quizzes.Quiz", on_delete=models.PROTECT, related_name="sessions"
    )
    host      = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="hosted_sessions",
        db_index=True,
    )
    game_code = models.CharField(max_length=6, unique=True, db_index=True)
    status    = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default=STATUS_LOBBY, db_index=True
    )
    started_at  = models.DateTimeField(null=True, blank=True)
    ended_at    = models.DateTimeField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "quiz_sessions_gamesession"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Session {self.game_code} ({self.status})"


class PlayerSession(models.Model):
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    game_session = models.ForeignKey(
        GameSession, on_delete=models.CASCADE, related_name="players", db_index=True
    )
    user         = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="player_sessions",
    )
    nickname    = models.CharField(max_length=30)
    final_score = models.PositiveIntegerField(default=0)
    final_rank  = models.PositiveSmallIntegerField(null=True, blank=True)
    joined_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "quiz_sessions_playersession"
        ordering = ["final_rank", "-final_score"]
        indexes  = [models.Index(fields=["game_session", "final_rank"])]

    def __str__(self):
        return f"{self.nickname} in {self.game_session.game_code}"


class PlayerAnswer(models.Model):
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    player_session  = models.ForeignKey(
        PlayerSession, on_delete=models.CASCADE, related_name="answers", db_index=True
    )
    question        = models.ForeignKey(
        "quizzes.Question", on_delete=models.CASCADE, db_index=True
    )
    selected_option = models.ForeignKey(
        "quizzes.AnswerOption", null=True, blank=True, on_delete=models.SET_NULL
    )
    is_correct      = models.BooleanField(default=False)
    response_time   = models.FloatField(help_text="Seconds to answer")
    points_awarded  = models.PositiveIntegerField(default=0)
    answered_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table       = "quiz_sessions_playeranswer"
        unique_together = [("player_session", "question")]
        indexes        = [models.Index(fields=["player_session", "question"])]

    def __str__(self):
        return (
            f"{self.player_session.nickname} → "
            f"Q{self.question.order} "
            f"{'✓' if self.is_correct else '✗'} +{self.points_awarded}pts"
        )
