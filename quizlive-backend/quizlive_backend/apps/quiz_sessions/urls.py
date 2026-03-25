"""
quiz_sessions/urls.py  — complete URL table matching the React frontend.

Frontend calls:
  POST   /api/v1/sessions/join/          validate code (public, no auth)
  POST   /api/v1/sessions/create/        teacher creates session
  GET    /api/v1/sessions/               teacher lists own sessions
  GET    /api/v1/sessions/<code>/        session detail
  GET    /api/v1/sessions/<code>/status/ lightweight status (public)
  POST   /api/v1/sessions/<code>/end/    teacher ends session
  GET    /api/v1/sessions/<code>/players/ list players
"""
from django.urls import path
from .views import (
    SessionJoinView,
    SessionCreateView,
    SessionListView,
    SessionDetailView,
    SessionStatusView,
    SessionEndView,
    SessionPlayersView,
)

urlpatterns = [
    # ── Public endpoints (no auth) ───────────────────────────────────────────
    path("join/",                    SessionJoinView.as_view(),    name="session-join"),

    # ── Teacher endpoints ────────────────────────────────────────────────────
    path("create/",                  SessionCreateView.as_view(),  name="session-create"),
    path("",                         SessionListView.as_view(),    name="session-list"),

    # ── Per-session endpoints ────────────────────────────────────────────────
    path("<str:game_code>/",         SessionDetailView.as_view(),  name="session-detail"),
    path("<str:game_code>/status/",  SessionStatusView.as_view(),  name="session-status"),
    path("<str:game_code>/end/",     SessionEndView.as_view(),     name="session-end"),
    path("<str:game_code>/players/", SessionPlayersView.as_view(), name="session-players"),
]
