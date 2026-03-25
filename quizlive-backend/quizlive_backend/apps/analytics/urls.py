"""Analytics URL patterns. File goes to: apps/analytics/urls.py"""
from django.urls import path
from .views import (
    SessionSummaryView,
    QuestionAnalyticsView,
    PlayerResultsView,
    ExportCSVView,
)

urlpatterns = [
    # ── FIXED: added /summary/ path to match frontend getSummary() call ───────
    path("sessions/<str:game_code>/summary/",   SessionSummaryView.as_view(),    name="analytics-summary"),
    path("sessions/<str:game_code>/questions/", QuestionAnalyticsView.as_view(), name="analytics-questions"),
    path("sessions/<str:game_code>/players/",   PlayerResultsView.as_view(),     name="analytics-players"),
    path("sessions/<str:game_code>/export/",    ExportCSVView.as_view(),         name="analytics-export"),
]
