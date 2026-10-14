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
