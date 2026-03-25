"""Custom DRF permission classes for role-based access."""
from rest_framework.permissions import BasePermission


class IsTeacher(BasePermission):
    """Allow access only to users with role=teacher."""
    message = "Only teachers can perform this action."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_teacher)


class IsStudent(BasePermission):
    """Allow access only to users with role=student."""
    message = "Only students can perform this action."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_student)


class IsOwner(BasePermission):
    """Object-level permission: only the owner can access."""
    def has_object_permission(self, request, view, obj):
        return obj.owner == request.user
