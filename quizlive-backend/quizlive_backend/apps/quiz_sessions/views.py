"""
quiz_sessions/views.py

All REST views for game session management.
WebSocket game logic lives in consumers.py — not here.
"""
import logging

from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsTeacher
from services.code_generator import generate_unique_code
from services.redis_client import redis_conn
from . import game_engine
from .models import GameSession, PlayerSession
from .serializers import (
    GameSessionCreateSerializer,
    GameSessionSerializer,
    PlayerSessionSerializer,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Public
# ─────────────────────────────────────────────────────────────────────────────

class SessionJoinView(APIView):
    """
    POST /api/v1/sessions/join/
    Body: { game_code: "ABC123", nickname: "Alice" }

    Validates that the game exists and is still in lobby.
    Does NOT create a PlayerSession (that happens over WebSocket).
    Returns the session status so the frontend can decide whether to connect.
    No authentication required — anyone with a code can join.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        game_code = (request.data.get("game_code") or "").strip().upper()
        nickname  = (request.data.get("nickname")  or "").strip()

        if len(game_code) != 6:
            return Response(
                {"error": "game_code must be exactly 6 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not nickname:
            return Response(
                {"error": "nickname is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(nickname) > 30:
            return Response(
                {"error": "nickname must be 30 characters or fewer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check Redis first (fastest path)
        session_status = game_engine.get_session_status(game_code)
        if session_status is None:
            return Response(
                {"error": "Game not found. Check the code and try again."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if session_status == "finished":
            return Response(
                {"error": "This game has already ended."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if session_status == "active":
            return Response(
                {"error": "This game is already in progress."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        player_count = redis_conn.zcard(f"game:{game_code}:leaderboard")
        return Response({
            "game_code":    game_code,
            "status":       session_status,
            "player_count": player_count,
            "nickname":     nickname,
        })


class SessionStatusView(APIView):
    """
    GET /api/v1/sessions/<game_code>/status/
    Lightweight public check — no auth required.
    """
    permission_classes = [AllowAny]

    def get(self, request, game_code: str):
        code       = game_code.upper()
        status_val = game_engine.get_session_status(code)
        if status_val is None:
            return Response(
                {"error": "Game not found. Check the code and try again."},
                status=status.HTTP_404_NOT_FOUND,
            )
        player_count = redis_conn.zcard(f"game:{code}:leaderboard")
        return Response({
            "game_code":    code,
            "status":       status_val,
            "player_count": player_count,
        })


# ─────────────────────────────────────────────────────────────────────────────
# Teacher
# ─────────────────────────────────────────────────────────────────────────────

class SessionCreateView(APIView):
    """
    POST /api/v1/sessions/create/
    Teacher creates a new game session for one of their quizzes.
    Returns the game_code the host shares with players.
    """
    permission_classes = [IsTeacher]

    def post(self, request):
        quiz_id = request.data.get("quiz_id")
        if not quiz_id:
            return Response(
                {"error": "quiz_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.quizzes.models import Quiz
        try:
            quiz = Quiz.objects.prefetch_related(
                "questions", "questions__options"
            ).get(id=quiz_id, owner=request.user)
        except Quiz.DoesNotExist:
            return Response({"error": "Quiz not found."}, status=status.HTTP_404_NOT_FOUND)

        if quiz.questions.count() == 0:
            return Response(
                {"error": "This quiz has no questions. Add questions before hosting."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        game_code = generate_unique_code()
        session   = GameSession.objects.create(
            quiz=quiz,
            host=request.user,
            game_code=game_code,
        )

        # Initialise Redis so WebSocket consumers can find the session immediately
        game_engine.create_session_in_redis(
            session_id=str(session.id),
            game_code=game_code,
            quiz_id=str(quiz.id),
            host_id=str(request.user.id),
        )
        questions = list(quiz.questions.prefetch_related("options").order_by("order"))
        game_engine.cache_questions_in_redis(game_code, questions)

        logger.info("Session created: game_code=%s quiz='%s' host=%s",
                    game_code, quiz.title, request.user.username)
        return Response(
            GameSessionCreateSerializer(session).data,
            status=status.HTTP_201_CREATED,
        )


class SessionListView(generics.ListAPIView):
    """
    GET /api/v1/sessions/
    Returns the teacher's recent sessions (newest first).
    """
    serializer_class   = GameSessionSerializer
    permission_classes = [IsTeacher]

    def get_queryset(self):
        return (
            GameSession.objects
            .filter(host=self.request.user)
            .select_related("quiz")
            .order_by("-created_at")[:50]
        )


class SessionDetailView(APIView):
    """GET /api/v1/sessions/<game_code>/ — full session info."""
    permission_classes = [IsAuthenticated]

    def get(self, request, game_code: str):
        try:
            session = GameSession.objects.select_related("quiz", "host").get(
                game_code=game_code.upper()
            )
        except GameSession.DoesNotExist:
            return Response({"error": "Session not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(GameSessionSerializer(session).data)


class SessionEndView(APIView):
    """POST /api/v1/sessions/<game_code>/end/ — host ends session via REST."""
    permission_classes = [IsTeacher]

    def post(self, request, game_code: str):
        try:
            session = GameSession.objects.get(
                game_code=game_code.upper(), host=request.user
            )
        except GameSession.DoesNotExist:
            return Response({"error": "Session not found."}, status=status.HTTP_404_NOT_FOUND)

        if session.status == GameSession.STATUS_FINISHED:
            return Response(
                {"error": "Session is already finished."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session.status   = GameSession.STATUS_FINISHED
        session.ended_at = timezone.now()
        session.save()
        return Response({"message": "Session ended.", "game_code": game_code.upper()})


class SessionPlayersView(generics.ListAPIView):
    """GET /api/v1/sessions/<game_code>/players/"""
    serializer_class   = PlayerSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PlayerSession.objects.filter(
            game_session__game_code=self.kwargs["game_code"].upper()
        ).order_by("final_rank", "-final_score")
