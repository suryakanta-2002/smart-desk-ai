from django.contrib import admin
from django.contrib import admin
from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        'title',
        'assigned_to',
        'status',
        'priority',
        'created_at',
    )

    list_filter = ('status', 'priority', 'created_at')

    search_fields = ('title', 'description', 'assigned_to__username')