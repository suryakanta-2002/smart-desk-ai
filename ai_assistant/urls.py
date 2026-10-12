from django.urls import path
from .views import AIChatView

app_name = "ai_assistant"

urlpatterns = [
    path("chat/", AIChatView.as_view(), name="chat"),
]
