"""Serializers for analytics responses."""
from rest_framework import serializers


class SessionSummarySerializer(serializers.Serializer):
    game_code = serializers.CharField()
    quiz_title = serializers.CharField()
    host = serializers.CharField()
    status = serializers.CharField()
    player_count = serializers.IntegerField()
    total_questions = serializers.IntegerField()
    started_at = serializers.DateTimeField(allow_null=True)
    ended_at = serializers.DateTimeField(allow_null=True)
    average_score = serializers.FloatField()
    highest_score = serializers.IntegerField()


class QuestionStatsSerializer(serializers.Serializer):
    question_id = serializers.UUIDField()
    question_text = serializers.CharField()
    order = serializers.IntegerField()
    difficulty = serializers.CharField()
    total_answers = serializers.IntegerField()
    correct_answers = serializers.IntegerField()
    accuracy_pct = serializers.FloatField()
    avg_response_time = serializers.FloatField()
    avg_points = serializers.FloatField()


class PlayerResultSerializer(serializers.Serializer):
    player_id = serializers.UUIDField()
    nickname = serializers.CharField()
    final_score = serializers.IntegerField()
    final_rank = serializers.IntegerField(allow_null=True)
    correct_answers = serializers.IntegerField()
    total_answers = serializers.IntegerField()
    accuracy_pct = serializers.FloatField()
