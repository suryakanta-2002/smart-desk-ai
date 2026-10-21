from django.contrib.auth import authenticate
from rest_framework import serializers
from .models import User

from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Role
from django.contrib.auth.hashers import make_password
User = get_user_model()
class RegisterSerializer(serializers.ModelSerializer):
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "username",
            "first_name",
            "last_name",
            "email",
            "password",
            "confirm_password",
        ]
        extra_kwargs = {
            "password": {"write_only": True},
        }

    def validate(self, data):
        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError({
                "password": "Passwords do not match."
            })
        return data

    def create(self, validated_data):
        validated_data.pop("confirm_password")

        try:
            employee_role = Role.objects.get(name="Employee")
        except Role.DoesNotExist:
            raise serializers.ValidationError({
                "role": "Employee role is not configured. Please contact the administrator."
            })

        user = User.objects.create_user(
            **validated_data,
            role=employee_role,
        )
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(
        write_only=True
    )
    def validate(self, data):
        username = data.get("username")
        password = data.get("password")
        user = authenticate(
            username=username,
            password=password
        )
        if user is None:
            raise serializers.ValidationError(
                "Invalid username or password."
            )
        data["user"] = user
        return data

class AssignRoleSerializer(serializers.Serializer):

    role = serializers.CharField()

    def validate_role(self, value):

        from .models import Role

        try:
            role = Role.objects.get(name=value)
        except Role.DoesNotExist:
            raise serializers.ValidationError(
                "Role does not exist."
            )

        return role

class UserListSerializer(serializers.ModelSerializer):

    role = serializers.CharField(
        source="role.name",
        read_only=True
    )

    class Meta:
        model = User

        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "role",
            "is_active",
        ]

class UserStatusSerializer(serializers.Serializer):

    is_active = serializers.BooleanField()


class ProfileUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "email",
        ]

    def validate_email(self, value):
        user = self.instance

        if User.objects.filter(email__iexact=value).exclude(
            id=user.id
        ).exists():
            raise serializers.ValidationError(
                "This email is already in use."
            )

        return value