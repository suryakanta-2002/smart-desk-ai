from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
class Role(models.Model):

    name = models.CharField(
        max_length=50,
        unique=True
    )

    description = models.TextField(
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.name

class User(AbstractUser): 
    email = models.EmailField(
        unique=True
    )

    role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        related_name="users",
        null=True,
        blank=True
    )
    manager = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="team_members"
    )
    security_question = models.CharField(
        max_length=255,
        blank=True,
        default=""
    )

    security_answer_hash = models.CharField(
        max_length=128,
        blank=True,
        default=""
    )

class Permission(models.Model):

    name = models.CharField(
        max_length=100,
        unique=True
    )

    description = models.TextField(
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.name



class RolePermission(models.Model):

    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name="role_permissions"
    )

    permission = models.ForeignKey(
        Permission,
        on_delete=models.CASCADE,
        related_name="role_permissions"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["role", "permission"],
                name="unique_role_permission"
            )
        ]

    def __str__(self):
        return f"{self.role.name} - {self.permission.name}"
class EmailOTP(models.Model):
    PURPOSE_CHOICES = [
        ("login", "Login"),
        ("password_reset", "Password Reset"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_otps",
    )
    purpose = models.CharField(
        max_length=20,
        choices=PURPOSE_CHOICES,
    )
    otp_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "purpose", "is_used"]),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.purpose}"
