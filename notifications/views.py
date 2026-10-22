
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Notification.objects.filter(
            recipient=self.request.user
        )

        unread = self.request.query_params.get('unread')

        if unread == 'true':
            queryset = queryset.filter(is_read=False)
        elif unread == 'false':
            queryset = queryset.filter(is_read=True)

        return queryset


class UnreadNotificationCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            recipient=request.user,
            is_read=False,
        ).count()

        return Response({'unread_count': count})


class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        notification = Notification.objects.filter(
            recipient=request.user,
            pk=pk,
        ).first()

        if notification is None:
            return Response(
                {'detail': 'Notification not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        notification.is_read = True
        notification.save(update_fields=['is_read'])

        return Response(
            NotificationSerializer(notification).data
        )


class NotificationDeleteView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated]
    http_method_names = ['delete', 'head', 'options']

    def get_queryset(self):
        return Notification.objects.filter(
            recipient=self.request.user
        )
