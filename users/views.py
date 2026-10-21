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
import logging

from urllib.parse import urlencode

from django.conf import settings
from django.core.mail import send_mail
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode

from rest_framework.permissions import AllowAny

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

        user_role = (
            request.user.role.name.lower()
            if request.user.role
            else ""
        )

        # Admin and Manager can view team members.
        if user_role not in ["admin", "manager"]:
            return Response(
                {
                    "detail": "You do not have permission to view team members."
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
class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = str(request.data.get("email", "")).strip()

        if not email:
            return Response(
                {"email": ["Email is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(
            email__iexact=email,
            is_active=True,
        ).first()

        if user and user.has_usable_password():
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            reset_url = (
                f"{settings.FRONTEND_URL.rstrip('/')}/?"
                f"{urlencode({'page': 'reset', 'uid': uid, 'token': token})}"
            )
            print(f"\nRESET URL: {reset_url}\n")
            try:
                send_mail(
                    subject="Reset your Smart Desk AI password",
                    message=(
                        "We received a request to reset your password.\n\n"
                        f"Open this link to reset it:\n{reset_url}\n\n"
                        "This link is single-use and expires. "
                        "If you did not request this, ignore this email."
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except Exception:
                logging.getLogger(__name__).exception(
                    "Password reset email delivery failed."
                )

        return Response(
            {
                "message": (
                    "If an account exists for that email, "
                    "a password reset link will be sent."
                )
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        uid = request.data.get("uid")
        token = request.data.get("token")
        password = request.data.get("password")
        confirm_password = request.data.get("confirm_password")

        if not all([uid, token, password, confirm_password]):
            return Response(
                {"detail": "All fields are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if password != confirm_password:
            return Response(
                {"confirm_password": ["Passwords do not match."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id, is_active=True)
        except (
            TypeError,
            ValueError,
            OverflowError,
            User.DoesNotExist,
        ):
            return Response(
                {"detail": "Invalid or expired reset link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {"detail": "Invalid or expired reset link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(password, user=user)
        except DjangoValidationError as exc:
            return Response(
                {"password": exc.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(password)
        user.save(update_fields=["password"])

        return Response(
            {"message": "Password reset successfully. Please sign in."},
            status=status.HTTP_200_OK,
        )
