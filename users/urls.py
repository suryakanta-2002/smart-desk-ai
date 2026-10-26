
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView

from .views import (
    RegisterView,
    LoginView,
    LoginOTPVerifyView,
    ProfileView,
    AssignRoleView,
    UserListView,
    UserDetailView,
    UserStatusView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)

urlpatterns = [
    # Registration and OTP login
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path(
        "login/verify-otp/",
        LoginOTPVerifyView.as_view(),
        name="login-verify-otp",
    ),

    # JWT token management
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("logout/", TokenBlacklistView.as_view(), name="logout"),

    # User profile and management
    path("profile/", ProfileView.as_view(), name="profile"),
    path("users/", UserListView.as_view(), name="user-list"),
    path("users/<int:user_id>/", UserDetailView.as_view(), name="user-detail"),
    path(
        "users/<int:user_id>/role/",
        AssignRoleView.as_view(),
        name="assign-role",
    ),
    path(
        "users/<int:user_id>/status/",
        UserStatusView.as_view(),
        name="user-status",
    ),

    # Password reset using email OTP
    path(
        "password-reset/",
        PasswordResetRequestView.as_view(),
        name="password-reset",
    ),
    path(
        "password-reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),
]
