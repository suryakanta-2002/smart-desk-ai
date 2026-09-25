from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import User
from .permissions import has_permission
from .serializers import RegisterSerializer, LoginSerializer, AssignRoleSerializer
from rest_framework.permissions import IsAuthenticated

class RegisterView(APIView):

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.save()

            return Response(
                {
                    "message": "User registered successfully.",
                    "user_id": user.id,
                    "username": user.username,
                    "email": user.email,
                },
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class LoginView(APIView):

    def post(self, request):

        serializer = LoginSerializer(
            data=request.data
        )

        if serializer.is_valid():

            user = serializer.validated_data["user"]

            return Response(
                {
                    "message": "Login successful.",
                    "user_id": user.id,
                    "username": user.username,
                    "email": user.email,
                },
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

class ProfileView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        user = request.user

        return Response(
            {
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
            },
            status=status.HTTP_200_OK
        )

class AssignRoleView(APIView):

    permission_classes = [IsAuthenticated]

    def patch(self, request, user_id):

        # Only Admin can assign roles
        
        if not has_permission(
            request.user,
            "assign_roles"
        ):
            return Response(
                {
                    "detail": "You do not have permission to assign roles."
                },
                status=status.HTTP_403_FORBIDDEN
            )
        try:
            user = User.objects.get(
                id=user_id
            )
        except User.DoesNotExist:
            return Response(
                {
                    "detail": "User not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = AssignRoleSerializer(
            data=request.data
        )

        if serializer.is_valid():

            role = serializer.validated_data["role"]

            user.role = role
            user.save(
                update_fields=["role"]
            )

            return Response(
                {
                    "message": "User role updated successfully.",
                    "user_id": user.id,
                    "username": user.username,
                    "role": role.name,
                },
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
# Create your views here.
