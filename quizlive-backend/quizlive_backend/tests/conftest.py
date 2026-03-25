"""Pytest configuration for QuizLive backend tests."""
import django
from django.conf import settings
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

def pytest_configure():
    from django.conf import settings
    if not settings.configured:
        settings.configure(
            DATABASES={
                "default": {
                    "ENGINE": "django.db.backends.sqlite3",
                    "NAME": ":memory:",
                }
            },
            INSTALLED_APPS=[
                "django.contrib.admin",
                "django.contrib.auth",
                "django.contrib.contenttypes",
                "django.contrib.sessions",
                "django.contrib.messages",
                "rest_framework",
                "rest_framework_simplejwt",
                "rest_framework_simplejwt.token_blacklist",
                "corsheaders",
                "channels",
                "apps.accounts",
                "apps.quizzes",
                "apps.quiz_sessions",
                "apps.analytics",
            ],
            AUTH_USER_MODEL="accounts.CustomUser",
            DEFAULT_AUTO_FIELD="django.db.models.BigAutoField",
            SECRET_KEY="test-secret-key",
            ROOT_URLCONF="config.urls",
            CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}},
        )
