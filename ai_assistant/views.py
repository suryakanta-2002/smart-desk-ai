
import os
import time
import logging

from google import genai
from google.genai import errors
from httpx import TimeoutException

from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema

from users.permissions import has_permission

from .models import ChatConversation, ChatMessage
from .serializers import (
    AIChatSerializer,
    ChatConversationSerializer,
)


logger = logging.getLogger(__name__)

# Fast model first; standard Flash is the fallback.
GEMINI_MODELS = (
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
)

MAX_HISTORY_MESSAGES = 12
MAX_ATTEMPTS_PER_MODEL = 2


def generate_gemini_response(client, conversation_history, message):
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

    contents.append({
        "role": "user",
        "parts": [{"text": message}],
    })

    last_error = None

    for model in GEMINI_MODELS:
        for attempt in range(MAX_ATTEMPTS_PER_MODEL):
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=contents,
                )

                if response.text:
                    logger.info("AI response generated using %s", model)
                    return response

                logger.warning("Gemini returned an empty response for %s", model)
                break

            except errors.APIError as exc:
                last_error = exc
                error_code = getattr(exc, "code", None)

                # Retry only temporary service/rate-limit errors.
                if error_code not in (429, 500, 502, 503, 504):
                    raise

                if attempt + 1 < MAX_ATTEMPTS_PER_MODEL:
                    wait_seconds = 1 + attempt
                    logger.warning(
                        "Gemini model %s returned HTTP %s; retrying in %s second(s)",
                        model,
                        error_code,
                        wait_seconds,
                    )
                    time.sleep(wait_seconds)
                else:
                    logger.warning(
                        "Gemini model %s failed after retries with HTTP %s",
                        model,
                        error_code,
                    )

    if last_error:
        raise last_error

    return None


class AIChatView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=AIChatSerializer,
        responses={
            200: {
                "type": "object",
                "properties": {
                    "conversation_id": {"type": "integer"},
                    "answer": {"type": "string"},
                },
            },
        },
    )
    def post(self, request):
        if not has_permission(request.user, "use_ai_assistant"):
            return Response(
                {"detail": "You do not have permission to use the AI assistant."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AIChatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = serializer.validated_data["message"]
        conversation_id = serializer.validated_data["conversation_id"]

        conversation = get_object_or_404(
            ChatConversation,
            id=conversation_id,
            user=request.user,
        )

        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            logger.error("GEMINI_API_KEY is not configured.")
            return Response(
                {"detail": "AI service configuration is missing."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            client = genai.Client(
                api_key=api_key,
                http_options={"timeout": 20000},
            )

            # Keep recent history short to reduce token usage and latency.
            conversation_history = list(
                conversation.messages.order_by(
                    "-created_at", "-id"
                )[:MAX_HISTORY_MESSAGES]
            )
            conversation_history.reverse()

            response = generate_gemini_response(
                client,
                conversation_history,
                message,
            )

            if response is None or not response.text:
                return Response(
                    {"detail": "The AI service returned an empty response. Please try again."},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            # Save both messages together to avoid partial database writes.
            with transaction.atomic():
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

                conversation.save()

            return Response(
                {
                    "conversation_id": conversation.id,
                    "answer": response.text,
                },
                status=status.HTTP_200_OK,
            )

        except TimeoutException:
            logger.warning("Gemini request timed out.")
            return Response(
                {"detail": "The AI service took too long to respond. Please try again."},
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )

        except errors.APIError as exc:
            logger.exception("Gemini API request failed: %r", exc)

            error_code = getattr(exc, "code", None)

            if error_code == 429:
                detail = "AI usage limit reached. Please wait and try again."
                response_status = status.HTTP_429_TOO_MANY_REQUESTS
            else:
                detail = "AI service is temporarily unavailable. Please try again shortly."
                response_status = status.HTTP_503_SERVICE_UNAVAILABLE

            return Response(
                {"detail": detail},
                status=response_status,
            )


class ChatConversationListCreateView(generics.ListCreateAPIView):
    serializer_class = ChatConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChatConversation.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class ChatConversationDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ChatConversationSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        return ChatConversation.objects.filter(user=self.request.user)
