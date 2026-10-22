
from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    task_title = serializers.CharField(
        source='task.title',
        read_only=True,
        default=None,
    )

    class Meta:
        model = Notification
        fields = [
            'id',
            'title',
            'message',
            'notification_type',
            'is_read',
            'task',
            'task_title',
            'created_at',
        ]
        read_only_fields = fields
