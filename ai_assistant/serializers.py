from rest_framework import serializers
from .models import ChatConversation, ChatMessage


class AIChatSerializer(serializers.Serializer):
    message = serializers.CharField(
        required=True,
        allow_blank=False,
        trim_whitespace=True,
        max_length=4000,
    )
    conversation_id = serializers.IntegerField(
        required=True,
        min_value=1,
    )
    provider = serializers.ChoiceField(
        choices=["gemini", "openai"],
        required=False,
        default="gemini",
    )

class GroqWorkSerializer(serializers.Serializer):
    ACTION_CHOICES = [
        ("summarize", "Summarize Task"),
        ("plan", "Suggest Task Plan"),
        ("question", "Work-related Question"),
        ("report_insights", "Generate Report Insights"),
    ]

    action = serializers.ChoiceField(choices=ACTION_CHOICES)
    message = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=4000,
    )
    task_id = serializers.IntegerField(
        required=False,
        min_value=1,
    )
    conversation_history = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
        max_length=20,
    )

class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ["id", "role", "content", "created_at"]
        read_only_fields = ["id", "role", "created_at"]


class ChatConversationSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta:
        model = ChatConversation
        fields = [
            "id",
            "title",
            "messages",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "messages",
            "created_at",
            "updated_at",
        ]
