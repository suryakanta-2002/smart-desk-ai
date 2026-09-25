from django.contrib.auth import authenticate
from rest_framework import serializers
from .models import User


class RegisterSerializer(serializers.ModelSerializer):

    confirm_password = serializers.CharField(
        write_only=True
    )

    class Meta:
        model = User
        fields = [
            "username",
            "first_name",
            "last_name",
            "email",
            "password",
            "confirm_password"
        ]
        extra_kwargs = {
            "password": {
                "write_only": True
            }
        }

    def validate(self, data):
        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError(
                {"password": "Passwords do not match."}
            )

        return data

    def create(self, validated_data):
        validated_data.pop("confirm_password")

        user = User.objects.create_user(
            **validated_data
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