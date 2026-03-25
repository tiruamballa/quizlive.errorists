"""Initial migration for quizzes app."""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Quiz",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ("title", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True, default="")),
                ("is_public", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("owner", models.ForeignKey(
                    db_index=True, on_delete=django.db.models.deletion.CASCADE,
                    related_name="quizzes", to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"db_table": "quizzes_quiz", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="Question",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ("text", models.TextField()),
                ("question_type", models.CharField(
                    choices=[("mcq", "Multiple Choice"), ("truefalse", "True / False")],
                    default="mcq", max_length=20,
                )),
                ("difficulty", models.CharField(
                    choices=[("easy", "Easy"), ("medium", "Medium"), ("hard", "Hard")],
                    default="medium", max_length=10,
                )),
                ("time_limit_secs", models.PositiveSmallIntegerField(default=30)),
                ("order", models.PositiveSmallIntegerField(db_index=True, default=0)),
                ("base_points", models.PositiveSmallIntegerField(default=100)),
                ("quiz", models.ForeignKey(
                    db_index=True, on_delete=django.db.models.deletion.CASCADE,
                    related_name="questions", to="quizzes.quiz",
                )),
            ],
            options={"db_table": "quizzes_question", "ordering": ["order"]},
        ),
        migrations.CreateModel(
            name="AnswerOption",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ("text", models.CharField(max_length=300)),
                ("is_correct", models.BooleanField(default=False)),
                ("order", models.PositiveSmallIntegerField(default=0)),
                ("question", models.ForeignKey(
                    db_index=True, on_delete=django.db.models.deletion.CASCADE,
                    related_name="options", to="quizzes.question",
                )),
            ],
            options={"db_table": "quizzes_answeroption", "ordering": ["order"]},
        ),
    ]
