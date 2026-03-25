"""
Auth views.

POST /api/v1/auth/register/   → create account + return JWT pair
POST /api/v1/auth/login/      → authenticate + return JWT pair
GET  /api/v1/auth/me/         → return current user profile
PATCH /api/v1/auth/me/        → update username
POST /api/v1/auth/logout/     → blacklist refresh token
"""
import logging
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import CustomUser
from .serializers import (
    RegisterSerializer, LoginSerializer,
    UserSerializer, UserUpdateSerializer,
)

logger = logging.getLogger(__name__)


def _jwt_response(user: CustomUser) -> dict:
    """Generate access + refresh tokens for a user."""
    refresh = RefreshToken.for_user(user)
    return {
        'user':    UserSerializer(user).data,
        'access':  str(refresh.access_token),
        'refresh': str(refresh),
    }


class RegisterView(APIView):
    """
    POST /api/v1/auth/register/

    Body: { email, username, role, password, password2 }
    Returns: { user, access, refresh }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        logger.info("New %s registered: %s", user.role, user.email)
        return Response(_jwt_response(user), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    POST /api/v1/auth/login/

    Body: { email, password }
    Returns: { user, access, refresh }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        logger.info("Login: %s", user.email)
        return Response(_jwt_response(user))


class MeView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/v1/auth/me/   → current user profile
    PATCH /api/v1/auth/me/   → update username
    """
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UserUpdateSerializer
        return UserSerializer


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/

    Body: { refresh }
    Blacklists the refresh token so it can no longer be used.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'error': 'refresh token is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Successfully logged out.'})
        except TokenError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
