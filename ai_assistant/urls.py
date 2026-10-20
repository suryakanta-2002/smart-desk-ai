from django.urls import path
from .views import AIChatView, ChatConversationListCreateView, ChatConversationDetailView

app_name = "ai_assistant"

urlpatterns = [
    path("chat/", AIChatView.as_view(), name="chat"),
    path("conversations/",ChatConversationListCreateView.as_view(),name="conversation-list-create",),
    path("conversations/<int:pk>/",ChatConversationDetailView.as_view(),name="conversation-detail",),
]
