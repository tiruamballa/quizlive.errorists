"""Serializers for quiz_sessions app."""
from rest_framework import serializers
from .models import GameSession, PlayerSession, PlayerAnswer


class GameSessionCreateSerializer(serializers.ModelSerializer):
    """Minimal response after creating a session (contains game_code)."""
    class Meta:
        model  = GameSession
        fields = ("id", "quiz", "game_code", "status", "created_at")
        read_only_fields = ("id", "game_code", "status", "created_at")


class GameSessionSerializer(serializers.ModelSerializer):
    """Full session detail including nested quiz info and player count."""
    quiz_title   = serializers.CharField(source="quiz.title", read_only=True)
    host_username = serializers.CharField(source="host.username", read_only=True)
    player_count  = serializers.SerializerMethodField()

    class Meta:
        model  = GameSession
        fields = (
            "id", "quiz", "quiz_title", "host_username",
            "game_code", "status", "player_count",
            "started_at", "ended_at", "created_at",
        )
        read_only_fields = ("id", "game_code", "created_at")

    def get_player_count(self, obj) -> int:
        return obj.players.count()


class PlayerSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = PlayerSession
        fields = ("id", "nickname", "final_score", "final_rank", "joined_at")
        read_only_fields = ("id", "joined_at")
