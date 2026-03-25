import uuid
import django.contrib.auth.models
import django.utils.timezone
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='CustomUser',
            fields=[
                ('password',     models.CharField(max_length=128, verbose_name='password')),
                ('last_login',   models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('is_superuser', models.BooleanField(default=False)),
                ('id',           models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('email',        models.EmailField(max_length=254, unique=True)),
                ('username',     models.CharField(max_length=50, unique=True)),
                ('role',         models.CharField(choices=[('teacher', 'Teacher'), ('student', 'Student')], default='student', max_length=10)),
                ('is_active',    models.BooleanField(default=True)),
                ('is_staff',     models.BooleanField(default=False)),
                ('created_at',   models.DateTimeField(auto_now_add=True)),
                ('updated_at',   models.DateTimeField(auto_now=True)),
                ('groups',       models.ManyToManyField(blank=True, related_name='customuser_set', to='auth.group', verbose_name='groups')),
                ('user_permissions', models.ManyToManyField(blank=True, related_name='customuser_permissions_set', to='auth.permission', verbose_name='user permissions')),
            ],
            options={'db_table': 'users', 'verbose_name': 'User', 'verbose_name_plural': 'Users'},
            managers=[('objects', django.contrib.auth.models.BaseUserManager())],
        ),
        migrations.AddIndex(
            model_name='customuser',
            index=models.Index(fields=['email'], name='users_email_idx'),
        ),
        migrations.AddIndex(
            model_name='customuser',
            index=models.Index(fields=['role'], name='users_role_idx'),
        ),
    ]
