"""Views for auth: register, login (JWT), profile. File → apps/accounts/views.py"""
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import CustomUser
from .serializers import CustomTokenObtainPairSerializer, RegisterSerializer, UserSerializer


def _tokens_for_user(user):
    """Return access + refresh token strings for a user."""
    refresh = RefreshToken.for_user(user)
    # Embed extra claims to match CustomTokenObtainPairSerializer
    refresh["username"] = user.username
    refresh["role"]     = user.role
    return {
        "access":  str(refresh.access_token),
        "refresh": str(refresh),
        "user":    UserSerializer(user).data,
    }


class RegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/register/ — create a new user AND return JWT tokens."""
    queryset           = CustomUser.objects.all()
    serializer_class   = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # Return tokens immediately so the frontend can log the user in
        return Response(_tokens_for_user(user), status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    """POST /api/v1/auth/login/ — return access + refresh JWT."""
    serializer_class   = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


class MeView(APIView):
    """GET/PUT /api/v1/auth/me/ — profile of the current user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def put(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
