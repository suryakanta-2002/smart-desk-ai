
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count

from .models import Task
from .serializers import TaskSerializer
from users.models import User
from users.permissions import has_permission


def can_manage_tasks(user):
    return has_permission(user, 'manage_tasks')


class TaskListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Task.objects.filter(
            assigned_to=self.request.user
        ).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        if not can_manage_tasks(request.user):
            return Response(
                {'detail': 'You do not have permission to create tasks.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().create(request, *args, **kwargs)


class TaskUpdateView(generics.UpdateAPIView):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'patch', 'put', 'head', 'options']

    def get_queryset(self):
        queryset = Task.objects.all()

        if can_manage_tasks(self.request.user):
            return queryset

        return queryset.filter(assigned_to=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        if not can_manage_tasks(request.user):
            allowed_fields = {'status'}

            if not set(request.data.keys()).issubset(allowed_fields):
                return Response(
                    {
                        'detail': (
                            'Employees can update only their task status.'
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        return super().partial_update(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not can_manage_tasks(request.user):
            return Response(
                {
                    'detail': (
                        'Employees can update only their task status '
                        'using a partial update.'
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().update(request, *args, **kwargs)


class TaskDeleteView(generics.DestroyAPIView):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if can_manage_tasks(self.request.user):
            return Task.objects.all()

        return Task.objects.none()


class TaskAssignableUsersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not can_manage_tasks(request.user):
            return Response(
                {'detail': 'You do not have permission to assign tasks.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        employees = User.objects.filter(
            is_active=True,
            role__name__iexact='Employee',
        ).order_by('username')

        return Response([
            {
                'id': employee.id,
                'username': employee.username,
                'first_name': employee.first_name,
                'last_name': employee.last_name,
                'email': employee.email,
                'role': employee.role.name,
            }
            for employee in employees
        ])


class TeamReportsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (
            has_permission(request.user, 'view_team_reports')
            or has_permission(request.user, 'manage_users')
        ):
            return Response(
                {'detail': 'You do not have permission to view team reports.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        tasks = Task.objects.all()

        users = (
            Task.objects
            .values(
                'assigned_to',
                'assigned_to__username',
                'assigned_to__first_name',
                'assigned_to__last_name',
                'assigned_to__email',
            )
            .annotate(total_tasks=Count('id'))
            .order_by('assigned_to__username')
        )

        member_reports = []

        for member in users:
            member_tasks = tasks.filter(
                assigned_to_id=member['assigned_to']
            )

            member_reports.append({
                'user_id': member['assigned_to'],
                'username': member['assigned_to__username'],
                'first_name': member['assigned_to__first_name'],
                'last_name': member['assigned_to__last_name'],
                'email': member['assigned_to__email'],
                'total_tasks': member_tasks.count(),
                'completed_tasks': member_tasks.filter(
                    status='completed'
                ).count(),
                'pending_tasks': member_tasks.filter(
                    status='pending'
                ).count(),
                'in_progress_tasks': member_tasks.filter(
                    status='in_progress'
                ).count(),
            })

        return Response({
            'total_tasks': tasks.count(),
            'completed_tasks': tasks.filter(status='completed').count(),
            'pending_tasks': tasks.filter(status='pending').count(),
            'in_progress_tasks': tasks.filter(status='in_progress').count(),
            'high_priority_tasks': tasks.filter(priority='high').count(),
            'member_reports': member_reports,
        })