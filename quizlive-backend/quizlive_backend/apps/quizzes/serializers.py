"""Serializers for quizzes app."""
from rest_framework import serializers
from .models import AnswerOption, Question, Quiz


class AnswerOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnswerOption
        fields = ("id", "text", "is_correct", "order")


class AnswerOptionPublicSerializer(serializers.ModelSerializer):
    """Safe version — never exposes is_correct (sent to students during game)."""
    class Meta:
        model = AnswerOption
        fields = ("id", "text", "order")


class QuestionSerializer(serializers.ModelSerializer):
    quiz = serializers.PrimaryKeyRelatedField(read_only=True)
    options = AnswerOptionSerializer(many=True, required=False)

    class Meta:
        model = Question
        fields = (
            "id", "quiz", "text", "question_type", "difficulty",
            "time_limit_secs", "order", "base_points", "options",
        )
        read_only_fields = ("id","quiz")

    def validate(self, attrs):
        options = attrs.get("options", [])
        correct_count = sum(1 for o in options if o.get("is_correct"))
        if options and correct_count != 1:
            raise serializers.ValidationError(
                {"options": "Exactly one option must be marked as correct."}
            )
        return attrs

    def create(self, validated_data):
        options_data = validated_data.pop("options", [])
        question = Question.objects.create(**validated_data)
        for idx, opt_data in enumerate(options_data):
            opt_data.setdefault("order", idx)
            AnswerOption.objects.create(question=question, **opt_data)
        return question

    def update(self, instance, validated_data):
        options_data = validated_data.pop("options", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if options_data is not None:
            instance.options.all().delete()
            for idx, opt_data in enumerate(options_data):
                opt_data.setdefault("order", idx)
                AnswerOption.objects.create(question=instance, **opt_data)
        return instance


class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    question_count = serializers.IntegerField(read_only=True)
    owner = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Quiz
        fields = (
            "id", "owner", "title", "description", "is_public",
            "question_count", "questions", "created_at", "updated_at",
        )
        read_only_fields = ("id", "owner", "created_at", "updated_at")


class QuizListSerializer(serializers.ModelSerializer):
    """Lightweight serializer — no nested questions."""
    question_count = serializers.IntegerField(read_only=True)
    owner = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Quiz
        fields = ("id", "owner", "title", "description", "is_public", "question_count", "created_at")
        read_only_fields = ("id", "owner", "created_at")
