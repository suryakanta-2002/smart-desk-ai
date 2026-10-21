
from django.urls import path

from .views import (
    TaskListCreateView,
    TaskUpdateView,
    TaskDeleteView,
    TeamReportsView,
)


urlpatterns = [
    path('', TaskListCreateView.as_view(), name='task-list-create'),
    path('<int:pk>/', TaskUpdateView.as_view(), name='task-update'),
    path('<int:pk>/delete/',TaskDeleteView.as_view(),name='task-delete',),
    path('team-reports/', TeamReportsView.as_view(), name='team-reports'),
]
