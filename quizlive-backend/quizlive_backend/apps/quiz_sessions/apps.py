from django.apps import AppConfig

class QuizSessionsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name  = "apps.quiz_sessions"
    label = "quiz_sessions"   # ← avoids clash with django.contrib.sessions
