"""Quiz, Question, and AnswerOption models."""
import uuid
from django.db import models
from django.conf import settings


class Quiz(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="quizzes",
        db_index=True,
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    is_public = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "quizzes_quiz"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} (by {self.owner.username})"

    @property
    def question_count(self):
        return self.questions.count()


class Question(models.Model):
    DIFFICULTY_EASY = "easy"
    DIFFICULTY_MEDIUM = "medium"
    DIFFICULTY_HARD = "hard"
    DIFFICULTY_CHOICES = [
        (DIFFICULTY_EASY, "Easy"),
        (DIFFICULTY_MEDIUM, "Medium"),
        (DIFFICULTY_HARD, "Hard"),
    ]

    TYPE_MCQ = "mcq"
    TYPE_TRUEFALSE = "truefalse"
    TYPE_CHOICES = [
        (TYPE_MCQ, "Multiple Choice"),
        (TYPE_TRUEFALSE, "True / False"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="questions", db_index=True)
    text = models.TextField()
    question_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_MCQ)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default=DIFFICULTY_MEDIUM)
    time_limit_secs = models.PositiveSmallIntegerField(default=30)
    order = models.PositiveSmallIntegerField(default=0, db_index=True)
    base_points = models.PositiveSmallIntegerField(default=100)

    class Meta:
        db_table = "quizzes_question"
        ordering = ["order"]

    def __str__(self):
        return f"Q{self.order}: {self.text[:60]}"


class AnswerOption(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="options", db_index=True
    )
    text = models.CharField(max_length=300)
    is_correct = models.BooleanField(default=False)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "quizzes_answeroption"
        ordering = ["order"]

    def __str__(self):
        return f"{'✓' if self.is_correct else '✗'} {self.text[:60]}"
