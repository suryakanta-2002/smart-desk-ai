
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView

from .views import (
    RegisterView,
    LoginView,
    ChangePasswordView,
    ProfileView,
    AssignRoleView,
    UserListView,
    UserDetailView,
    UserStatusView,
)

urlpatterns = [
    # Registration and login
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),

    # Change password for authenticated users
    path(
        "change-password/",
        ChangePasswordView.as_view(),
        name="change-password",
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
]
