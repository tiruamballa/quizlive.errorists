"""Initial migration for sessions app."""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("quizzes", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="GameSession",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ("game_code", models.CharField(db_index=True, max_length=6, unique=True)),
                ("status", models.CharField(
                    choices=[("lobby", "Lobby"), ("active", "Active"), ("finished", "Finished")],
                    db_index=True, default="lobby", max_length=10,
                )),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("ended_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("host", models.ForeignKey(
                    db_index=True, on_delete=django.db.models.deletion.CASCADE,
                    related_name="hosted_sessions", to=settings.AUTH_USER_MODEL,
                )),
                ("quiz", models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name="sessions", to="quizzes.quiz",
                )),
            ],
            options={"db_table": "sessions_gamesession", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="PlayerSession",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ("nickname", models.CharField(max_length=30)),
                ("final_score", models.PositiveIntegerField(default=0)),
                ("final_rank", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("joined_at", models.DateTimeField(auto_now_add=True)),
                ("game_session", models.ForeignKey(
                    db_index=True, on_delete=django.db.models.deletion.CASCADE,
                    related_name="players", to="quiz_sessions.gamesession",
                )),
                ("user", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="player_sessions", to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"db_table": "sessions_playersession", "ordering": ["final_rank", "-final_score"]},
        ),
        migrations.CreateModel(
            name="PlayerAnswer",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ("is_correct", models.BooleanField(default=False)),
                ("response_time", models.FloatField()),
                ("points_awarded", models.PositiveIntegerField(default=0)),
                ("answered_at", models.DateTimeField(auto_now_add=True)),
                ("player_session", models.ForeignKey(
                    db_index=True, on_delete=django.db.models.deletion.CASCADE,
                    related_name="answers", to="quiz_sessions.playersession",
                )),
                ("question", models.ForeignKey(
                    db_index=True, on_delete=django.db.models.deletion.CASCADE,
                    to="quizzes.question",
                )),
                ("selected_option", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    to="quizzes.answeroption",
                )),
            ],
            options={"db_table": "sessions_playeranswer"},
        ),
        migrations.AddConstraint(
            model_name="playeranswer",
            constraint=models.UniqueConstraint(
                fields=("player_session", "question"), name="unique_player_question_answer"
            ),
        ),
        migrations.AddIndex(
            model_name="playersession",
            index=models.Index(fields=["game_session", "final_rank"], name="sessions_pl_game_se_idx"),
        ),
        migrations.AddIndex(
            model_name="playeranswer",
            index=models.Index(fields=["player_session", "question"], name="sessions_pa_player_q_idx"),
        ),
    ]
