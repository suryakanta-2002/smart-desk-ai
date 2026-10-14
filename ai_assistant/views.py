
import os
import time
from google import genai
from google.genai import errors
from httpx import TimeoutException

from django.shortcuts import get_object_or_404

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import has_permission

from .models import ChatConversation, ChatMessage
from .serializers import (
    AIChatSerializer,
    ChatConversationSerializer,
)
from drf_spectacular.utils import extend_schema

def generate_gemini_response(client, conversation_history, message):
    max_attempts = 3

    # Convert database messages to Gemini's format.
    contents = []

    for chat_message in conversation_history:
        role = (
            "model"
            if chat_message.role == ChatMessage.Role.ASSISTANT
            else "user"
        )

        contents.append({
            "role": role,
            "parts": [{"text": chat_message.content}],
        })

    # Add the current user message.
    contents.append({
        "role": "user",
        "parts": [{"text": message}],
    })

    for attempt in range(max_attempts):
        try:
            return client.models.generate_content(
                model="gemini-3.5-flash",
                contents=contents,
            )

        except errors.APIError as exc:
            error_code = getattr(exc, "code", None)

            if error_code not in (429, 500, 502, 503, 504):
                raise

            if attempt == max_attempts - 1:
                raise

            wait_seconds = 2 ** attempt

            print(
                f"Gemini temporary error {error_code}. "
                f"Retrying in {wait_seconds} seconds..."
            )

            time.sleep(wait_seconds)


class AIChatView(APIView):
    permission_classes = [IsAuthenticated]
    @extend_schema(
        request=AIChatSerializer,
        responses={
            200: {
                "type": "object",
                "properties": {
                    "conversation_id": {
                        "type": "integer"
                    },
                    "answer": {
                        "type": "string"
                    },
                },
            },
        },
    )
    def post(self, request):
        # Step 1: Check permission
        if not has_permission(request.user, "use_ai_assistant"):
            return Response(
                {
                    "detail": (
                        "You do not have permission "
                        "to use the AI assistant."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Step 2: Validate request data
        serializer = AIChatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = serializer.validated_data["message"]
        conversation_id = serializer.validated_data["conversation_id"]

        # Step 3: Ensure conversation belongs to current user
        conversation = get_object_or_404(
            ChatConversation,
            id=conversation_id,
            user=request.user,
        )

        # Step 4: Check API key
        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            return Response(
                {"detail": "Gemini API key is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # Step 5: Send conversation history to Gemini
        try:
            client = genai.Client(
                api_key=api_key,
                http_options={"timeout": 30000},
            )

            conversation_history = list(
                conversation.messages.order_by(
                    "created_at", "id"
                )[:20]
            )

            response = generate_gemini_response(
                client,
                conversation_history,
                message,
            )

            if not response.text:
                return Response(
                    {"detail": "Gemini returned an empty response."},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            # Step 6: Save both messages
            ChatMessage.objects.create(
                conversation=conversation,
                role=ChatMessage.Role.USER,
                content=message,
            )

            ChatMessage.objects.create(
                conversation=conversation,
                role=ChatMessage.Role.ASSISTANT,
                content=response.text,
            )

            # Update conversation timestamp
            conversation.save()

            # Step 7: Return response
            return Response(
                {
                    "conversation_id": conversation.id,
                    "answer": response.text,
                },
                status=status.HTTP_200_OK,
            )

        except TimeoutException:
            return Response(
                {
                    "detail": (
                        "The AI service timed out. "
                        "Please try again later."
                    )
                },
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )

        except errors.APIError as exc:
            print("Gemini API error:", repr(exc))

            return Response(
                {
                    "detail": (
                        "The AI service is temporarily unavailable. "
                        "Please try again later."
                    )
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )


class ChatConversationListCreateView(
    generics.ListCreateAPIView
):
    serializer_class = ChatConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChatConversation.objects.filter(
            user=self.request.user
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
