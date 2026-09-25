from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User, Role


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "name",
        "description",
        "created_at",
    )

    search_fields = (
        "name",
    )

    ordering = (
        "id",
    )

@admin.register(User)
class CustomUserAdmin(UserAdmin):

    list_display = (
        "username",
        "email",
        "role",
        "is_staff",
        "is_active",
    )

    list_filter = (
        "role",
        "is_staff",
        "is_active",
    )

    search_fields = (
        "username",
        "email",
    )

    fieldsets = UserAdmin.fieldsets + (
        (
            "Smart Desk AI Role",
            {
                "fields": (
                    "role",
                )
            }
        ),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            "Smart Desk AI",
            {
                "fields": (
                    "email",
                    "role",
                )
            }
        ),
    )
