from django.urls import path
from .views import TeamReportsView


urlpatterns = [
    path("team/", TeamReportsView.as_view(), name="team-reports"),
]