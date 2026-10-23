
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import User, Role, Permission, RolePermission
from unittest.mock import patch
from ai_assistant.models import ChatConversation, ChatMessage
class AIChatAPITest(APITestCase):

    def setUp(self):
        self.employee_role = Role.objects.get(name="Employee")

        self.employee = User.objects.create_user(
            username="ai_test_employee",
            email="ai_test_employee@test.com",
            password="Test@12345",
            role=self.employee_role,
        )

        self.permission = Permission.objects.get(
            name="use_ai_assistant"
        )

        self.conversation = ChatConversation.objects.create(
            user=self.employee,
            title="Test AI Conversation",
        )

    def authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}"
        )

    def test_unauthenticated_user_gets_401(self):
        response = self.client.post(
            "/api/ai/chat/",
            {"message": "Explain Python decorators.",
             "conversation_id": self.conversation.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 401)


    def test_user_without_permission_gets_403(self):
        RolePermission.objects.filter(
            role=self.employee_role,
            permission=self.permission,
        ).delete()

        self.authenticate(self.employee)

        response = self.client.post(
            "/api/ai/chat/",
            {"message": "Explain Python decorators.",
             "conversation_id": self.conversation.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)


    def test_empty_message_gets_400(self):
        RolePermission.objects.get_or_create(
            role=self.employee_role,
            permission=self.permission,
        )
        self.authenticate(self.employee)

        response = self.client.post(
            "/api/ai/chat/",
            {"message": "   ",
             "conversation_id": self.conversation.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)



    @patch("ai_assistant.views.os.getenv", return_value="test-key")
    @patch("ai_assistant.views.genai.Client")
    def test_authorized_user_gets_200(self, mock_client_class, mock_getenv):
        RolePermission.objects.get_or_create(
            role=self.employee_role,
            permission=self.permission,
        )
        self.authenticate(self.employee)

        mock_client = mock_client_class.return_value
        mock_client.models.generate_content.return_value.text = (
            "Python is a programming language."
        )

        response = self.client.post(
            "/api/ai/chat/",
            {"message": "Explain Python decorators.",
             "conversation_id": self.conversation.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["answer"],
            "Python is a programming language.",
        )
        mock_client.models.generate_content.assert_called_once()


    @patch("ai_assistant.views.os.getenv", return_value="test-key")
    @patch("ai_assistant.views.genai.Client")
    def test_gemini_timeout_returns_504(
        self,
        mock_client_class,
        mock_getenv,
    ):
        from httpx import TimeoutException

        RolePermission.objects.get_or_create(
            role=self.employee_role,
            permission=self.permission,
        )
        self.authenticate(self.employee)

        mock_client = mock_client_class.return_value
        mock_client.models.generate_content.side_effect = (
            TimeoutException("Request timed out")
        )

        response = self.client.post(
            "/api/ai/chat/",
            {"message": "Explain Python decorators.",
             "conversation_id": self.conversation.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 504)
        self.assertEqual(
            response.data["detail"],
            "The AI service took too long to respond. Please try again.",
        )


    @patch("ai_assistant.views.os.getenv", return_value="test-key")
    @patch("ai_assistant.views.genai.Client")
    def test_gemini_api_error_returns_502(
        self,
        mock_client_class,
        mock_getenv,
    ):
        from google.genai import errors

        RolePermission.objects.get_or_create(
            role=self.employee_role,
            permission=self.permission,
        )
        self.authenticate(self.employee)

        mock_client = mock_client_class.return_value
        mock_client.models.generate_content.side_effect = (
            errors.APIError(
                500,
                {"error": {"message": "Simulated API failure"}},
            )
        )

        response = self.client.post(
            "/api/ai/chat/",
            {"message": "Explain Python decorators.",
             "conversation_id": self.conversation.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(
            response.data["detail"],
            "AI service is temporarily unavailable. Please try again shortly.",
        )


    @patch("ai_assistant.views.os.getenv", return_value="test-key")
    @patch("ai_assistant.views.genai.Client")
    def test_empty_gemini_response_returns_502(
        self,
        mock_client_class,
        mock_getenv,
    ):
        RolePermission.objects.get_or_create(
            role=self.employee_role,
            permission=self.permission,
        )
        self.authenticate(self.employee)

        mock_client = mock_client_class.return_value
        mock_client.models.generate_content.return_value.text = ""

        response = self.client.post(
            "/api/ai/chat/",
            {"message": "Explain Python decorators.",
             "conversation_id": self.conversation.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 502)
        self.assertEqual(
            response.data["detail"],
            "The AI service returned an empty response. Please try again.",
        )
    def test_user_cannot_access_another_users_conversation(self):
        # Give the employee permission to use the AI assistant.
        RolePermission.objects.get_or_create(
            role=self.employee_role,
            permission=self.permission,
        )

        # Create another employee and their conversation.
        another_employee = User.objects.create_user(
            username="another_ai_employee",
            email="another_ai_employee@test.com",
            password="Test@12345",
            role=self.employee_role,
        )

        another_conversation = ChatConversation.objects.create(
            user=another_employee,
            title="Private Conversation",
        )

        # Authenticate as the first employee.
        self.authenticate(self.employee)

        # Try to access the other employee's conversation.
        response = self.client.post(
            "/api/ai/chat/",
            {
                "message": "Show me this conversation.",
                "conversation_id": another_conversation.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 404)

    @patch("ai_assistant.views.os.getenv", return_value="test-key")
    @patch("ai_assistant.views.genai.Client")
    def test_successful_chat_saves_both_messages(
        self,
        mock_client_class,
        mock_getenv,
    ):
        RolePermission.objects.get_or_create(
            role=self.employee_role,
            permission=self.permission,
        )
        self.authenticate(self.employee)

        mock_client = mock_client_class.return_value
        mock_client.models.generate_content.return_value.text = (
            "Python is easy to learn."
        )

        response = self.client.post(
            "/api/ai/chat/",
            {
                "message": "Explain Python.",
                "conversation_id": self.conversation.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        messages = ChatMessage.objects.filter(
            conversation=self.conversation
        ).order_by("created_at", "id")

        self.assertEqual(messages.count(), 2)

        self.assertEqual(
            messages[0].role,
            ChatMessage.Role.USER,
        )
        self.assertEqual(messages[0].content, "Explain Python.")

        self.assertEqual(
            messages[1].role,
            ChatMessage.Role.ASSISTANT,
        )
        self.assertEqual(
            messages[1].content,
            "Python is easy to learn.",
        )
    @patch("ai_assistant.views.os.getenv", return_value=None)
    @patch("ai_assistant.views.genai.Client")
    def test_missing_gemini_api_key_returns_503(
        self,
        mock_client_class,
        mock_getenv,
    ):
        RolePermission.objects.get_or_create(
            role=self.employee_role,
            permission=self.permission,
        )
        self.authenticate(self.employee)

        response = self.client.post(
            "/api/ai/chat/",
            {
                "message": "Explain Python.",
                "conversation_id": self.conversation.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(
            response.data["detail"],
            "AI service configuration is missing.",
        )
        mock_client_class.assert_not_called()


    @patch("ai_assistant.views.genai.Client")
    def test_nonexistent_conversation_returns_404(
        self,
        mock_client_class,
    ):
        RolePermission.objects.get_or_create(
            role=self.employee_role,
            permission=self.permission,
        )
        self.authenticate(self.employee)

        response = self.client.post(
            "/api/ai/chat/",
            {
                "message": "Explain Python.",
                "conversation_id": 999999,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 404)
        mock_client_class.assert_not_called()
    
    def test_openai_work_requires_authentication(self):
        response = self.client.post(
            "/api/ai/work/",
            {
                "action": "question",
                "message": "How can I prioritize my work?",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 401)

    @patch("ai_assistant.views.os.getenv")
    @patch("ai_assistant.views.Groq")
    def test_groq_can_summarize_own_task(
        self, mock_groq, mock_getenv
    ):
        from tasks.models import Task

        RolePermission.objects.get_or_create(
            role=self.employee_role,
            permission=self.permission,
        )
        self.authenticate(self.employee)

        task = Task.objects.create(
            title="Prepare project documentation",
            description="Document the API endpoints and authentication flow.",
            assigned_to=self.employee,
        )

        mock_getenv.side_effect = lambda key, default=None: {
            "GROQ_API_KEY": "test-key",
            "GROQ_MODEL": "openai/gpt-oss-20b",
        }.get(key, default)

        mock_groq.return_value.chat.completions.create.return_value.choices[0].message.content= (
            "Document the API endpoints and authentication flow."
        )

        response = self.client.post(
            "/api/ai/work/",
            {"action": "summarize", "task_id": task.id},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["action"], "summarize")
        self.assertIn("API endpoints", response.data["answer"])
        mock_groq.return_value.chat.completions.create.assert_called_once()

    def test_openai_rejects_invalid_action(self):
        RolePermission.objects.get_or_create(
            role=self.employee_role,
            permission=self.permission,
        )
        self.authenticate(self.employee)

        response = self.client.post(
            "/api/ai/work/",
            {"action": "delete_everything", "message": "test"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_employee_cannot_request_team_report_insights(self):
        RolePermission.objects.get_or_create(
            role=self.employee_role,
            permission=self.permission,
        )

        report_permission = Permission.objects.get(
            name="view_team_reports"
        )
        RolePermission.objects.filter(
            role=self.employee_role,
            permission=report_permission,
        ).delete()

        self.authenticate(self.employee)

        response = self.client.post(
            "/api/ai/work/",
            {
                "action": "report_insights",
                "message": "Analyze team performance.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    @patch("ai_assistant.views.os.getenv", return_value=None)
    @patch("ai_assistant.views.Groq")
    def test_groq_missing_api_key_returns_503(
        self, mock_groq, mock_getenv
    ):
        RolePermission.objects.get_or_create(
            role=self.employee_role,
            permission=self.permission,
        )
        self.authenticate(self.employee)

        response = self.client.post(
            "/api/ai/work/",
            {
                "action": "question",
                "message": "How should I prioritize my work?",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 503)
        mock_groq.assert_not_called()
