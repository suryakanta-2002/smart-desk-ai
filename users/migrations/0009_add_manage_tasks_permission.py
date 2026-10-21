
from django.db import migrations


def add_manage_tasks_permission(apps, schema_editor):
    Role = apps.get_model("users", "Role")
    Permission = apps.get_model("users", "Permission")
    RolePermission = apps.get_model("users", "RolePermission")

    permission, _ = Permission.objects.get_or_create(
        name="manage_tasks",
        defaults={
            "description": "Create, assign, update, and delete tasks."
        },
    )

    for role_name in ["Admin", "Manager"]:
        role = Role.objects.filter(name=role_name).first()

        if role:
            RolePermission.objects.get_or_create(
                role=role,
                permission=permission,
            )


def remove_manage_tasks_permission(apps, schema_editor):
    Permission = apps.get_model("users", "Permission")
    RolePermission = apps.get_model("users", "RolePermission")

    permission = Permission.objects.filter(
        name="manage_tasks"
    ).first()

    if permission:
        RolePermission.objects.filter(
            permission=permission
        ).delete()
        permission.delete()


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0011_user_security_answer_hash_user_security_question"),
    ]

    operations = [
        migrations.RunPython(
            add_manage_tasks_permission,
            remove_manage_tasks_permission,
        ),
    ]
