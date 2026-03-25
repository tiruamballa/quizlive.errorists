"""
Serializers for the users app.

RegisterSerializer  → validates and creates new users
LoginSerializer     → validates credentials, returns user object
UserSerializer      → safe read-only representation
"""
from django.contrib.auth import authenticate
from rest_framework import serializers
from .models import CustomUser


class RegisterSerializer(serializers.ModelSerializer):
    """
    Validates registration data.
    password / password2 are write-only and never returned.
    """
    password  = serializers.CharField(write_only=True, min_length=8,
                    style={'input_type': 'password'})
    password2 = serializers.CharField(write_only=True, label='Confirm Password',
                    style={'input_type': 'password'})

    class Meta:
        model  = CustomUser
        fields = ['email', 'username', 'role', 'password', 'password2']
        extra_kwargs = {
            'role': {'required': True},
        }

    def validate_email(self, value: str) -> str:
        if CustomUser.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('This email is already registered.')
        return value.lower()

    def validate_username(self, value: str) -> str:
        if CustomUser.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value

    def validate(self, data: dict) -> dict:
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password2': 'Passwords do not match.'})
        return data

    def create(self, validated_data: dict) -> CustomUser:
        validated_data.pop('password2')
        return CustomUser.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    """
    Accepts email + password, returns the authenticated user object.
    Does NOT return tokens here — tokens are generated in the view.
    """
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data: dict) -> dict:
        user = authenticate(
            request=self.context.get('request'),
            email=data['email'].lower(),
            password=data['password'],
        )
        if not user:
            raise serializers.ValidationError(
                'Invalid email or password. Please try again.'
            )
        if not user.is_active:
            raise serializers.ValidationError(
                'This account has been deactivated.'
            )
        return {'user': user}


class UserSerializer(serializers.ModelSerializer):
    """Safe read-only user representation (returned in auth responses)."""

    class Meta:
        model  = CustomUser
        fields = ['id', 'email', 'username', 'role', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Allow users to update their profile (username only — email requires
    separate verification flow, role cannot be changed post-registration).
    """
    class Meta:
        model  = CustomUser
        fields = ['username']

    def validate_username(self, value: str) -> str:
        user = self.context['request'].user
        if CustomUser.objects.filter(username__iexact=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value
