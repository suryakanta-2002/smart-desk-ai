from .models import RolePermission


def has_permission(user, permission_name):

    if not user.is_authenticated:
        return False

    if user.is_superuser:
        return True

    return RolePermission.objects.filter(
        role=user.role,
        permission__name=permission_name
    ).exists()