
from django.urls import path

from .views import (
    NotificationListView,
    UnreadNotificationCountView,
    NotificationMarkReadView,
    NotificationDeleteView,
)

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification-list'),
    path(
        'unread-count/',
        UnreadNotificationCountView.as_view(),
        name='notification-unread-count',
    ),
    path(
        '<int:pk>/read/',
        NotificationMarkReadView.as_view(),
        name='notification-mark-read',
    ),
    path(
        '<int:pk>/delete/',
        NotificationDeleteView.as_view(),
        name='notification-delete',
    ),
]
