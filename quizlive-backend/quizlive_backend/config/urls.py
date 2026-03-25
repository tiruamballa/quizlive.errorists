"""Root URL configuration. File goes to: config/urls.py"""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/",            admin.site.urls),
    path("api/v1/auth/",      include("apps.accounts.urls")),
    path("api/v1/quizzes/",   include("apps.quizzes.urls")),
    path("api/v1/sessions/",  include("apps.quiz_sessions.urls")),  # ← FIXED (was apps.sessions)
    path("api/v1/analytics/", include("apps.analytics.urls")),
]
