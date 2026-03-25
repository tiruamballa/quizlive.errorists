"""
Custom DRF permission classes.

IsTeacher → only users with role='teacher' pass
IsStudent → only users with role='student' pass
IsOwnerOrTeacher → allow resource owner or any teacher

Usage:
    class MyView(APIView):
        permission_classes = [IsTeacher]
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsTeacher(BasePermission):
    """Grant access only to authenticated teachers."""
    message = 'Only teachers can perform this action.'

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'teacher'
        )


class IsStudent(BasePermission):
    """Grant access only to authenticated students."""
    message = 'Only students can perform this action.'

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'student'
        )


class IsTeacherOrReadOnly(BasePermission):
    """
    Allow teachers full access.
    Allow safe (read) methods for any authenticated user.
    """
    message = 'Write access is restricted to teachers.'

    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role == 'teacher'


class IsResourceOwner(BasePermission):
    """Object-level: only the owner of the resource can access it."""
    message = 'You do not have permission to access this resource.'

    def has_object_permission(self, request, view, obj) -> bool:
        owner = getattr(obj, 'owner', None) or getattr(obj, 'host', None)
        return owner == request.user
