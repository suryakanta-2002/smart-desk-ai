from django.urls import path
from .views import RegisterView, LoginView, ProfileView, AssignRoleView, UserListView, UserDetailView, UserStatusView, PasswordResetRequestView, PasswordResetConfirmView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenBlacklistView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("token/",TokenObtainPairView.as_view(),name="token_obtain_pair"),
    path("token/refresh/",TokenRefreshView.as_view(),name="token_refresh"),
    path("profile/",ProfileView.as_view(),name="profile"),
    path("users/<int:user_id>/role/",AssignRoleView.as_view(),name="assign-role"),
    path("logout/",TokenBlacklistView.as_view(),name="logout"),
    path("users/",UserListView.as_view(),name="user-list"),
    path("users/<int:user_id>/",UserDetailView.as_view(),name="user-detail"),
    path("users/<int:user_id>/status/",UserStatusView.as_view(),name="user-status"),
    path("password-reset/",PasswordResetRequestView.as_view(),name="password-reset",),
    path("password-reset/confirm/",PasswordResetConfirmView.as_view(),name="password-reset-confirm",),
]