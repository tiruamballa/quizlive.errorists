"""
CustomUser model.

Extends AbstractBaseUser so we control the auth flow completely.
Uses email as the login field (not username).
Role field (teacher/student) is set at registration and governs all permissions.
"""
import uuid
from django.contrib.auth.models import (
    AbstractBaseUser, PermissionsMixin, BaseUserManager
)
from django.db import models


class CustomUserManager(BaseUserManager):
    """
    Manager for CustomUser.
    create_user  → normal accounts (teacher or student)
    create_superuser → staff/admin accounts
    """

    def create_user(self, email: str, password: str = None, **extra_fields):
        if not email:
            raise ValueError('Email address is required.')
        email = self.normalize_email(email)
        user  = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str, **extra_fields):
        extra_fields.setdefault('role',         'teacher')
        extra_fields.setdefault('is_staff',     True)
        extra_fields.setdefault('is_superuser', True)
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    """
    Custom user that:
    - Uses email for login
    - Has a role (teacher | student)
    - Uses UUID primary key (safe for external exposure)
    """

    ROLE_TEACHER = 'teacher'
    ROLE_STUDENT = 'student'
    ROLE_CHOICES = [
        (ROLE_TEACHER, 'Teacher'),
        (ROLE_STUDENT, 'Student'),
    ]

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email      = models.EmailField(max_length=254, unique=True)
    username   = models.CharField(max_length=50, unique=True)
    role       = models.CharField(max_length=10, choices=ROLE_CHOICES, default=ROLE_STUDENT)
    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CustomUserManager()

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role']),
        ]

    def __str__(self) -> str:
        return f'{self.username} <{self.email}> [{self.role}]'

    # ── Convenience properties ────────────────────────────────────────────────

    @property
    def is_teacher(self) -> bool:
        return self.role == self.ROLE_TEACHER

    @property
    def is_student(self) -> bool:
        return self.role == self.ROLE_STUDENT
