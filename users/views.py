
import logging
import os
import secrets
from datetime import timedelta

import requests
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password, check_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone

from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema

from .models import User, EmailOTP
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


def generate_email_otp():
    return f"{secrets.randbelow(1_000_000):06d}"

def send_resend_email(to_email, subject, body):
    api_key = getattr(settings, "RESEND_API_KEY", "").strip()
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "").strip()

    if not api_key or not from_email:
        logger.error("Resend API key or sender email is missing.")
        return False

    try:
        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": from_email,
                "to": [to_email],
                "subject": subject,
                "text": body,
            },
            timeout=15,
        )

        if response.status_code not in (200, 201):
            logger.error(
                "Resend failed: status=%s response=%s",
                response.status_code,
                response.text[:500],
            )
            return False

        logger.info("Resend accepted verification email.")
        return True

    except requests.RequestException:
        logger.exception("Resend HTTP request failed.")
        return False
def create_and_send_otp(user, purpose):
    # Invalidate any previous OTP for this user and purpose.
    EmailOTP.objects.filter(
        user=user,
        purpose=purpose,
        is_used=False,
    ).update(is_used=True)

    otp = generate_email_otp()

    record = EmailOTP.objects.create(
        user=user,
        purpose=purpose,
        otp_hash=make_password(otp),
        expires_at=timezone.now() + timedelta(minutes=5),
    )

    sent = send_resend_email(
        user.email,
        "Your Smart Desk AI verification code",
        (
            f"Your verification code is: {otp}\n\n"
            "This code expires in 5 minutes. "
            "If you did not request it, please ignore this email."
        ),
    )

    if not sent:
        record.is_used = True
        record.save(update_fields=["is_used"])

    return sent


def verify_email_otp(user, purpose, otp):
    if not isinstance(otp, str) or len(otp) != 6 or not otp.isdigit():
        return None

    record = EmailOTP.objects.filter(
        user=user,
        purpose=purpose,
        is_used=False,
        expires_at__gt=timezone.now(),
    ).order_by("-created_at").first()

    if not record or not check_password(otp, record.otp_hash):
        return None

    record.is_used = True
    record.save(update_fields=["is_used"])
    return record


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

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        try:
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

            if not user.email:
                return Response(
                    {"detail": "This account does not have a registered email."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not create_and_send_otp(user, "login"):
                return Response(
                    {"detail": "Unable to send verification code. Please try again later."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            return Response({
                "message": "Verification code sent to your registered email.",
                "otp_required": True,
                "username": user.username,
            }, status=status.HTTP_200_OK)

        except Exception:
            logger.exception("LOGIN_ENDPOINT_FAILED")
            raise
class LoginOTPVerifyView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        username = str(request.data.get("username", "")).strip()
        otp = request.data.get("otp", "")

        user = User.objects.filter(
            username__iexact=username,
            is_active=True,
        ).first()

        if not user or not verify_email_otp(user, "login", otp):
            return Response(
                {"detail": "Invalid or expired verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        refresh = RefreshToken.for_user(user)

        return Response({
            "message": "Login successful.",
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user_id": user.id,
            "username": user.username,
            "email": user.email,
        }, status=status.HTTP_200_OK)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "user_id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "role": user.role.name if user.role else None,
        }, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = ProfileUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
        )

        if serializer.is_valid():
            serializer.save()
            user = request.user
            return Response({
                "user_id": user.id,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "role": user.role.name if user.role else None,
            }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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

            return Response({
                "message": "User role updated successfully.",
                "user_id": user.id,
                "username": user.username,
                "role": role.name,
            }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_role = request.user.role.name.lower() if request.user.role else ""

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

        return Response({
            "message": "User status updated successfully.",
            "user_id": user.id,
            "is_active": user.is_active,
        }, status=status.HTTP_200_OK)


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
            if not create_and_send_otp(user, "password_reset"):
                return Response(
                    {"detail": "Unable to send verification code. Please try again later."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

        return Response({
            "message": "If an account exists for that email, a verification code will be sent."
        }, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = str(request.data.get("email", "")).strip()
        otp = request.data.get("otp", "")
        password = request.data.get("password")
        confirm_password = request.data.get("confirm_password")

        if not all([email, otp, password, confirm_password]):
            return Response(
                {"detail": "Email, OTP, password and confirmation are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if password != confirm_password:
            return Response(
                {"confirm_password": ["Passwords do not match."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(
            email__iexact=email,
            is_active=True,
        ).first()

        if not user or not verify_email_otp(user, "password_reset", otp):
            return Response(
                {"detail": "Invalid or expired verification code."},
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

        # Invalidate any remaining password-reset codes.
        EmailOTP.objects.filter(
            user=user,
            purpose="password_reset",
            is_used=False,
        ).update(is_used=True)

        return Response(
            {"message": "Password reset successfully. Please sign in."},
            status=status.HTTP_200_OK,
        )
