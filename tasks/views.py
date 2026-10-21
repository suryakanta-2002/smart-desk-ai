
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Task
from .serializers import TaskSerializer
from rest_framework.response import Response
from django.db.models import Count
from rest_framework.views import APIView
from users.permissions import has_permission

class TaskListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Task.objects.filter(
            assigned_to=self.request.user
        ).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(assigned_to=self.request.user)


class TaskUpdateView(generics.UpdateAPIView):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Task.objects.filter(
            assigned_to=self.request.user
        )

class TaskDeleteView(generics.DestroyAPIView):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Task.objects.filter(
            assigned_to=self.request.user
        )

class TeamReportsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (
            has_permission(request.user, 'view_team_reports')
            or has_permission(request.user, 'manage_users')
        ):
            return Response(
                {'detail': 'You do not have permission to view team reports.'},
                status=403,
            )

        tasks = Task.objects.all()

        member_reports = []
        users = (
            Task.objects
            .values(
                'assigned_to',
                'assigned_to__username',
                'assigned_to__first_name',
                'assigned_to__last_name',
                'assigned_to__email',
            )
            .annotate(
                total_tasks=Count('id'),
            )
            .order_by('assigned_to__username')
        )

        for member in users:
            member_tasks = tasks.filter(assigned_to_id=member['assigned_to'])

            member_reports.append({
                'user_id': member['assigned_to'],
                'username': member['assigned_to__username'],
                'first_name': member['assigned_to__first_name'],
                'last_name': member['assigned_to__last_name'],
                'email': member['assigned_to__email'],
                'total_tasks': member_tasks.count(),
                'completed_tasks': member_tasks.filter(status='completed').count(),
                'pending_tasks': member_tasks.filter(status='pending').count(),
                'in_progress_tasks': member_tasks.filter(status='in_progress').count(),
            })

        return Response({
            'total_tasks': tasks.count(),
            'completed_tasks': tasks.filter(status='completed').count(),
            'pending_tasks': tasks.filter(status='pending').count(),
            'in_progress_tasks': tasks.filter(status='in_progress').count(),
            'high_priority_tasks': tasks.filter(priority='high').count(),
            'member_reports': member_reports,
        })
