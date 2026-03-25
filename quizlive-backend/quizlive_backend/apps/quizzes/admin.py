from django.contrib import admin
from .models import AnswerOption, Question, Quiz


class AnswerOptionInline(admin.TabularInline):
    model = AnswerOption
    extra = 2


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 0
    show_change_link = True


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "question_count", "is_public", "created_at")
    list_filter = ("is_public",)
    search_fields = ("title", "owner__username")
    inlines = [QuestionInline]


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("text", "quiz", "difficulty", "question_type", "order", "base_points")
    list_filter = ("difficulty", "question_type")
    inlines = [AnswerOptionInline]
