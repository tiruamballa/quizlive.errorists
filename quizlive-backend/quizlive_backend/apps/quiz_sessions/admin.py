from django.contrib import admin
from .models import GameSession, PlayerAnswer, PlayerSession


class PlayerSessionInline(admin.TabularInline):
    model         = PlayerSession
    extra         = 0
    readonly_fields = ("final_score", "final_rank", "joined_at")


@admin.register(GameSession)
class GameSessionAdmin(admin.ModelAdmin):
    list_display  = ("game_code", "quiz", "host", "status", "created_at", "started_at", "ended_at")
    list_filter   = ("status",)
    search_fields = ("game_code", "host__username")
    inlines       = [PlayerSessionInline]


@admin.register(PlayerSession)
class PlayerSessionAdmin(admin.ModelAdmin):
    list_display = ("nickname", "game_session", "final_score", "final_rank", "joined_at")
    list_filter  = ("game_session__status",)


@admin.register(PlayerAnswer)
class PlayerAnswerAdmin(admin.ModelAdmin):
    list_display = ("player_session", "question", "is_correct", "points_awarded", "response_time")
    list_filter  = ("is_correct",)
