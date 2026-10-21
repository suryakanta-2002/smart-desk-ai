from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import User
from .permissions import has_permission
from .serializers import RegisterSerializer, LoginSerializer, AssignRoleSerializer, UserListSerializer, UserStatusSerializer, ProfileUpdateSerializer
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
import os
import requests
from rest_framework.exceptions import ValidationError


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
            data={
                "secret": secret_key,
                "response": token,
            },
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

        # Verify Google reCAPTCHA before creating the account.
        verify_recaptcha(captcha_token)

        serializer = RegisterSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.save()
            return Response({
                "message": "User registered successfully.",
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
            }, status=status.HTTP_201_CREATED)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

class LoginView(APIView):

    def post(self, request):

        serializer = LoginSerializer(
            data=request.data
        )

        if serializer.is_valid():

            user = serializer.validated_data["user"]

            return Response(
                {
                    "message": "Login successful.",
                    "user_id": user.id,
                    "username": user.username,
                    "email": user.email,
                },
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
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

        # Only Admin can assign roles
        
        if not has_permission(
            request.user,
            "assign_roles"
        ):
            return Response(
                {
                    "detail": "You do not have permission to assign roles."
                },
                status=status.HTTP_403_FORBIDDEN
            )
        try:
            user = User.objects.get(
                id=user_id
            )
        except User.DoesNotExist:
            return Response(
                {
                    "detail": "User not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = AssignRoleSerializer(
            data=request.data
        )

        if serializer.is_valid():

            role = serializer.validated_data["role"]

            user.role = role
            user.save(
                update_fields=["role"]
            )

            return Response(
                {
                    "message": "User role updated successfully.",
                    "user_id": user.id,
                    "username": user.username,
                    "role": role.name,
                },
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

class UserListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        if not has_permission(
            request.user,
            "manage_users"
        ):
            return Response(
                {
                    "detail": "You do not have permission to manage users."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        users = User.objects.all().order_by("id")

        serializer = UserListSerializer(
            users,
            many=True
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

class UserDetailView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):

        if not has_permission(
            request.user,
            "manage_users"
        ):
            return Response(
                {
                    "detail": "You do not have permission to manage users."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {
                    "detail": "User not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = UserListSerializer(user)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

class UserStatusView(APIView):

    permission_classes = [IsAuthenticated]

    def patch(self, request, user_id):

        if not has_permission(
            request.user,
            "manage_users"
        ):
            return Response(
                {
                    "detail": "You do not have permission to manage users."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {
                    "detail": "User not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = UserStatusSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        user.is_active = serializer.validated_data["is_active"]
        user.save(update_fields=["is_active"])

        return Response(
            {
                "message": "User status updated successfully.",
                "user_id": user.id,
                "is_active": user.is_active
            },
            status=status.HTTP_200_OK
        )

