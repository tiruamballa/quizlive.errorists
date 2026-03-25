"""Initial migration for accounts app."""
from django.db import migrations, models
import django.utils.timezone
import uuid


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.CreateModel(
            name="CustomUser",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ("password", models.CharField(max_length=128, verbose_name="password")),
                ("last_login", models.DateTimeField(blank=True, null=True, verbose_name="last login")),
                ("is_superuser", models.BooleanField(default=False)),
                ("email", models.EmailField(db_index=True, max_length=254, unique=True)),
                ("username", models.CharField(db_index=True, max_length=50, unique=True)),
                ("role", models.CharField(
                    choices=[("teacher", "Teacher"), ("student", "Student")],
                    db_index=True, default="student", max_length=10,
                )),
                ("is_active", models.BooleanField(default=True)),
                ("is_staff", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("groups", models.ManyToManyField(
                    blank=True, related_name="user_set",
                    related_query_name="user", to="auth.group",
                    verbose_name="groups",
                )),
                ("user_permissions", models.ManyToManyField(
                    blank=True, related_name="user_set",
                    related_query_name="user", to="auth.permission",
                    verbose_name="user permissions",
                )),
            ],
            options={"db_table": "accounts_user", "verbose_name": "User", "verbose_name_plural": "Users"},
        ),
    ]
