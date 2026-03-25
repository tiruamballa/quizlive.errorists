"""URL patterns for quizzes app."""
from django.urls import path
from .views import (
    AnswerOptionDetailView,
    AnswerOptionListCreateView,
    QuestionDetailView,
    QuestionListCreateView,
    QuizCSVImportView,
    QuizCSVPreviewView,
    QuizDetailView,
    QuizListCreateView,
)

urlpatterns = [
    # ── Quiz list / create ────────────────────────────────────────────────────
    path("", QuizListCreateView.as_view(), name="quiz-list"),

    # ── CSV import — MUST come before <uuid:pk>/ to avoid routing conflict ───
    path("csv/preview/", QuizCSVPreviewView.as_view(), name="csv-preview"),
    path("csv/import/",  QuizCSVImportView.as_view(),  name="csv-import"),

    # ── Quiz detail ───────────────────────────────────────────────────────────
    path("<uuid:pk>/", QuizDetailView.as_view(), name="quiz-detail"),

    # ── Questions ─────────────────────────────────────────────────────────────
    path(
        "<uuid:quiz_id>/questions/",
        QuestionListCreateView.as_view(),
        name="question-list",
    ),
    path(
        "<uuid:quiz_id>/questions/<uuid:pk>/",
        QuestionDetailView.as_view(),
        name="question-detail",
    ),

    # ── Answer options ────────────────────────────────────────────────────────
    path(
        "<uuid:quiz_id>/questions/<uuid:question_id>/options/",
        AnswerOptionListCreateView.as_view(),
        name="option-list",
    ),
    path(
        "<uuid:quiz_id>/questions/<uuid:question_id>/options/<uuid:pk>/",
        AnswerOptionDetailView.as_view(),
        name="option-detail",
    ),
]