
import logging
import os

import requests
from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.password_validation import validate_password

from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema

from .models import User
from .permissions import has_permission
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    AssignRoleSerializer,
    UserListSerializer,
    UserStatusSerializer,
    ProfileUpdateSerializer,
)

logger = logging.getLogger(__name__)


def verify_recaptcha(token):
    if not token:
        raise ValidationError({
            "captcha": "Please complete the reCAPTCHA verification."
        })

    secret_key = os.getenv("RECAPTCHA_SECRET_KEY")

    if not secret_key:
        raise ValidationError({
            "captcha": "reCAPTCHA is not configured on the server."
        })

    try:
        response = requests.post(
            "https://www.google.com/recaptcha/api/siteverify",
            data={"secret": secret_key, "response": token},
            timeout=10,
        )
        response.raise_for_status()
        result = response.json()
    except (requests.RequestException, ValueError):
        raise ValidationError({
            "captcha": "Unable to verify CAPTCHA. Please try again."
        })

    if not result.get("success"):
        raise ValidationError({
            "captcha": "CAPTCHA verification failed. Please try again."
        })


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        request=RegisterSerializer,
        responses={
            201: {
                "type": "object",
                "properties": {
                    "message": {"type": "string"},
                    "user_id": {"type": "integer"},
                    "username": {"type": "string"},
                    "email": {"type": "string"},
                },
            },
            400: {"description": "Invalid registration data"},
        },
        description="Register a new user account.",
    )
    def post(self, request):
        captcha_token = request.data.get("captcha_token")
        verify_recaptcha(captcha_token)

        serializer = RegisterSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.save()
            return Response(
                {
                    "message": "User registered successfully.",
                    "user_id": user.id,
                    "username": user.username,
                    "email": user.email,
                },
                status=status.HTTP_201_CREATED,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = serializer.validated_data["user"]

        if not user.is_active:
            return Response(
                {"detail": "This account is inactive."},
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "message": "Login successful.",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
            },
            status=status.HTTP_200_OK,
        )


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get("current_password", "")
        new_password = request.data.get("new_password", "")
        confirm_password = request.data.get("confirm_password", "")

        if not current_password or not new_password or not confirm_password:
            return Response(
                {
                    "detail": (
                        "Current password, new password and confirmation "
                        "are required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user

        if not user.check_password(current_password):
            return Response(
                {"current_password": ["Current password is incorrect."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_password != confirm_password:
            return Response(
                {"confirm_password": ["Passwords do not match."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            return Response(
                {"new_password": exc.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])

        return Response(
            {"message": "Password changed successfully. Please sign in again."},
            status=status.HTTP_200_OK,
        )


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        return Response(
            {
                "user_id": user.id,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "role": user.role.name if user.role else None,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        serializer = ProfileUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
        )

        if serializer.is_valid():
            serializer.save()
            user = request.user

            return Response(
                {
                    "user_id": user.id,
                    "username": user.username,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "email": user.email,
                    "role": user.role.name if user.role else None,
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )


class AssignRoleView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, user_id):
        if not has_permission(request.user, "assign_roles"):
            return Response(
                {"detail": "You do not have permission to assign roles."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AssignRoleSerializer(data=request.data)

        if serializer.is_valid():
            role = serializer.validated_data["role"]
            user.role = role
            user.save(update_fields=["role"])

            return Response(
                {
                    "message": "User role updated successfully.",
                    "user_id": user.id,
                    "username": user.username,
                    "role": role.name,
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )


class UserListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_role = (
            request.user.role.name.lower()
            if request.user.role
            else ""
        )

        if user_role not in ["admin", "manager"]:
            return Response(
                {"detail": "You do not have permission to view team members."},
                status=status.HTTP_403_FORBIDDEN,
            )

        users = User.objects.all().order_by("id")
        serializer = UserListSerializer(users, many=True)

        return Response(serializer.data, status=status.HTTP_200_OK)


class UserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        if not has_permission(request.user, "manage_users"):
            return Response(
                {"detail": "You do not have permission to manage users."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = UserListSerializer(user)

        return Response(serializer.data, status=status.HTTP_200_OK)


class UserStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, user_id):
        if not has_permission(request.user, "manage_users"):
            return Response(
                {"detail": "You do not have permission to manage users."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = UserStatusSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.is_active = serializer.validated_data["is_active"]
        user.save(update_fields=["is_active"])

        return Response(
            {
                "message": "User status updated successfully.",
                "user_id": user.id,
                "is_active": user.is_active,
            },
            status=status.HTTP_200_OK,
        )
