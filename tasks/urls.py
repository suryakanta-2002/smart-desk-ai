
from django.urls import path

from .views import (
    TaskListCreateView,
    TaskUpdateView,
    TaskDeleteView,
)


urlpatterns = [
    path('', TaskListCreateView.as_view(), name='task-list-create'),
    path('<int:pk>/', TaskUpdateView.as_view(), name='task-update'),
    path('<int:pk>/delete/',TaskDeleteView.as_view(),name='task-delete',),
]
