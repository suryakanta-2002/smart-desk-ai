from django.db import models
from users.models import User


class Report(models.Model):

    employee = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="reports"
    )

    title = models.CharField(
        max_length=200
    )

    description = models.TextField()

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.title
