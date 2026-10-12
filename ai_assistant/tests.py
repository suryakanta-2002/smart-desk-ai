
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import User, Role, Permission, RolePermission
from unittest.mock import patch

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

    def authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}"
        )

    def test_unauthenticated_user_gets_401(self):
        response = self.client.post(
            "/api/ai/chat/",
            {"message": "Explain Python decorators."},
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
            {"message": "Explain Python decorators."},
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
            {"message": "   "},
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
            {"message": "Explain Python decorators."},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["answer"],
            "Python is a programming language.",
        )
        mock_client.models.generate_content.assert_called_once()
