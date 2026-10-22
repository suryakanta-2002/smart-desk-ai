from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from tasks.models import Task
from notifications.models import Notification


class Command(BaseCommand):
    help = 'Create reminders for tasks approaching their deadlines.'

    def handle(self, *args, **options):
        now = timezone.now()
        reminder_window = now + timedelta(hours=24)

        tasks = Task.objects.filter(
            due_date__gt=now,
            due_date__lte=reminder_window,
        ).exclude(status='completed').select_related('assigned_to')

        created_count = 0

        for task in tasks:
            already_notified = Notification.objects.filter(
                recipient=task.assigned_to,
                task=task,
                notification_type='task_reminder',
                created_at__date=timezone.localdate(),
            ).exists()

            if already_notified:
                continue

            Notification.objects.create(
                recipient=task.assigned_to,
                title='Task Deadline Reminder',
                message=(
                    f'The deadline for "{task.title}" is approaching. '
                    f'Deadline: {timezone.localtime(task.due_date).strftime("%d %b %Y, %I:%M %p")}.'
                ),
                notification_type='task_reminder',
                task=task,
            )
            created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Created {created_count} task reminder(s).'
            )
        )