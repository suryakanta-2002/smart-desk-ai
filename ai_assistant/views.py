
import os

from google import genai
from google.genai import errors

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from users.permissions import has_permission
from .serializers import AIChatSerializer


class AIChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not has_permission(
            request.user,
            "use_ai_assistant",
        ):
            return Response(
                {
                    "detail": (
                        "You do not have permission "
                        "to use the AI assistant."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AIChatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = serializer.validated_data["message"]

        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            return Response(
                {"detail": "Gemini API key is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            client = genai.Client(api_key=api_key)

            response = client.models.generate_content(
                model="gemini-3.5-flash",
                contents=message,
            )

            if not response.text:
                return Response(
                    {"detail": "Gemini returned an empty response."},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            return Response(
                {"answer": response.text},
                status=status.HTTP_200_OK,
            )

        except errors.APIError:
            return Response(
                {
                    "detail": (
                        "The AI service is temporarily unavailable. "
                        "Please try again later."
                    )
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
