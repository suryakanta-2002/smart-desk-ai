from django.test import TestCase
from rest_framework.test import APITestCase, APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, Role, Permission, RolePermission
from .serializers import RegisterSerializer, LoginSerializer
from rest_framework import status
from .permissions import has_permission

class RegisterSerializerTest(TestCase):

    def test_valid_registration_data(self):
        data = {
            "username": "surya",
            "first_name": "Surya",
            "last_name": "Das",
            "email": "surya@example.com",
            "password": "Test@12345",
            "confirm_password": "Test@12345",
        }

        serializer = RegisterSerializer(data=data)

        self.assertTrue(serializer.is_valid())

    def test_password_mismatch(self):
        data = {
            "username": "surya2",
            "first_name": "Surya",
            "last_name": "Das",
            "email": "surya2@example.com",
            "password": "Test@12345",
            "confirm_password": "Wrong@12345",
        }

        serializer = RegisterSerializer(data=data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("password", serializer.errors)


class LoginSerializerTest(TestCase):

    def setUp(self):
        User.objects.create_user(
            username="surya",
            email="surya@test.com",
            password="Test@12345"
        )

    def test_valid_login(self):

        data = {
            "username": "surya",
            "password": "Test@12345"
        }

        serializer = LoginSerializer(data=data)

        self.assertTrue(serializer.is_valid())
    def test_wrong_password(self):

        data = {
            "username": "surya",
            "password": "WrongPassword123"
        }
        serializer = LoginSerializer(data=data)
        self.assertFalse(serializer.is_valid())
    
    def test_unknown_user(self):

        data = {
            "username": "unknown_user",
            "password": "Test@12345"
        }

        serializer = LoginSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_missing_username(self):

        data = {
            "password": "Test@12345"
        }

        serializer = LoginSerializer(data=data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("username", serializer.errors)
    def test_missing_password(self):

        data = {
            "username": "surya"
        }

        serializer = LoginSerializer(data=data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("password", serializer.errors)

    def test_both_fields_missing(self):

        data = {}

        serializer = LoginSerializer(data=data)

        self.assertFalse(serializer.is_valid())

        self.assertIn("username", serializer.errors)
        self.assertIn("password", serializer.errors)

class LoginAPITest(APITestCase):

    def setUp(self):
        User.objects.create_user(
            username="surya",
            email="surya@test.com",
            password="Test@12345"
        )

    def test_login_success(self):

        response = self.client.post(
            "/api/auth/login/",
            {
                "username": "surya",
                "password": "Test@12345"
            },
            format="json"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["username"],
            "surya"
        )

    def test_login_wrong_password(self):

        response = self.client.post(
            "/api/auth/login/",
            {
                "username": "surya",
                "password": "WrongPassword123"
            },
            format="json"
        )

        self.assertEqual(response.status_code, 400)

    def test_login_unknown_user(self):

        response = self.client.post(
            "/api/auth/login/",
            {
                "username": "unknown_user",
                "password": "Test@12345"
            },
            format="json"
        )

        self.assertEqual(response.status_code, 400)
    def test_login_missing_username(self):

        response = self.client.post(
            "/api/auth/login/",
            {
                "password": "Test@12345"
            },
            format="json"
        )

        self.assertEqual(response.status_code, 400)

        self.assertIn(
            "username",
            response.data
        )

    def test_login_missing_password(self):

        response = self.client.post(
            "/api/auth/login/",
            {
                "username": "surya"
            },
            format="json"
        )

        self.assertEqual(response.status_code, 400)

        self.assertIn(
            "password",
            response.data
        )

    def test_login_both_fields_missing(self):

        response = self.client.post(
            "/api/auth/login/",
            {},
            format="json"
        )

        self.assertEqual(response.status_code, 400)

        self.assertIn(
            "username",
            response.data
        )

        self.assertIn(
            "password",
            response.data
        )

class RolePermissionAPITest(APITestCase):

    def setUp(self):

        self.admin_role = Role.objects.get(
            name="Admin"
        )

        self.manager_role = Role.objects.get(
            name="Manager"
        )

        self.employee_role = Role.objects.get(
            name="Employee"
        )
        self.admin_user = User.objects.create_user(
            username="admin_test",
            email="admin_test@test.com",
            password="Test@12345",
            role=self.admin_role
        )

        self.manager_user = User.objects.create_user(
            username="manager_test",
            email="manager_test@test.com",
            password="Test@12345",
            role=self.manager_role
        )

        self.employee_user = User.objects.create_user(
            username="employee_test",
            email="employee_test@test.com",
            password="Test@12345",
            role=self.employee_role
        )

        self.target_user = User.objects.create_user(
            username="target_test",
            email="target_test@test.com",
            password="Test@12345",
            role=self.employee_role
        )

    def get_access_token(self, user):

        refresh = RefreshToken.for_user(user)

        return str(refresh.access_token)

    def test_admin_can_assign_role(self):

        token = self.get_access_token(
            self.admin_user
        )

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token}"
        )

        response = self.client.patch(
            f"/api/auth/users/{self.target_user.id}/role/",
            {
                "role": "Manager"
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            200
        )

        self.target_user.refresh_from_db()

        self.assertEqual(
            self.target_user.role.name,
            "Manager"
        )

class UserListAPITest(APITestCase):

    def setUp(self):

        self.admin_role = Role.objects.get(
            name="Admin"
        )

        self.manager_role = Role.objects.get(
            name="Manager"
        )

        self.employee_role = Role.objects.get(
            name="Employee"
        )

        self.admin_user = User.objects.create_user(
            username="list_admin",
            email="list_admin@test.com",
            password="Test@12345",
            role=self.admin_role
        )

        self.manager_user = User.objects.create_user(
            username="list_manager",
            email="list_manager@test.com",
            password="Test@12345",
            role=self.manager_role
        )

        self.employee_user = User.objects.create_user(
            username="list_employee",
            email="list_employee@test.com",
            password="Test@12345",
            role=self.employee_role
        )

        self.target_user = User.objects.create_user(
            username="list_target",
            email="list_target@test.com",
            password="Test@12345",
            role=self.employee_role
        )

    def get_access_token(self, user):

        refresh = RefreshToken.for_user(user)

        return str(refresh.access_token)

    def test_admin_can_list_users(self):

        token = self.get_access_token(
            self.admin_user
        )

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token}"
        )

        response = self.client.get(
            "/api/auth/users/"
        )

        self.assertEqual(
            response.status_code,
            200
        )

        self.assertTrue(
            isinstance(response.data, list)
        )

    def test_manager_cannot_list_users(self):

        token = self.get_access_token(
            self.manager_user
        )

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token}"
        )

        response = self.client.get(
            "/api/auth/users/"
        )

        self.assertEqual(
            response.status_code,
            403
        )

    def test_employee_cannot_list_users(self):

        token = self.get_access_token(
            self.employee_user
        )

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token}"
        )

        response = self.client.get(
            "/api/auth/users/"
        )

        self.assertEqual(
            response.status_code,
            403
        )

    def test_unauthenticated_user_cannot_list_users(self):

        response = self.client.get(
            "/api/auth/users/"
        )

        self.assertEqual(
            response.status_code,
            401
        )

class UserDetailAPITest(APITestCase):

    def setUp(self):
        self.admin_role = Role.objects.get(name="Admin")
        self.manager_role = Role.objects.get(name="Manager")
        self.employee_role = Role.objects.get(name="Employee")

        self.admin_user = User.objects.create_user(
            username="detail_admin",
            email="detail_admin@test.com",
            password="Test@12345",
            role=self.admin_role
        )

        self.manager_user = User.objects.create_user(
            username="detail_manager",
            email="detail_manager@test.com",
            password="Test@12345",
            role=self.manager_role
        )

        self.employee_user = User.objects.create_user(
            username="detail_employee",
            email="detail_employee@test.com",
            password="Test@12345",
            role=self.employee_role
        )

        self.target_user = User.objects.create_user(
            username="detail_target",
            email="detail_target@test.com",
            password="Test@12345",
            role=self.employee_role
        )

    def get_access_token(self, user):
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    def test_admin_can_view_user_detail(self):
        token = self.get_access_token(self.admin_user)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token}"
        )

        response = self.client.get(
            f"/api/auth/users/{self.target_user.id}/"
        )

        self.assertEqual(
            response.status_code,
            200
        )

        self.assertEqual(
            response.data["id"],
            self.target_user.id
        )

        self.assertEqual(
            response.data["username"],
            "detail_target"
        )

    def test_manager_cannot_view_user_detail(self):
        token = self.get_access_token(self.manager_user)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token}"
        )

        response = self.client.get(
            f"/api/auth/users/{self.target_user.id}/"
        )

        self.assertEqual(
            response.status_code,
            403
        )

    def test_employee_cannot_view_user_detail(self):
        token = self.get_access_token(self.employee_user)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token}"
        )

        response = self.client.get(
            f"/api/auth/users/{self.target_user.id}/"
        )

        self.assertEqual(
            response.status_code,
            403
        )

    def test_unauthenticated_user_cannot_view_user_detail(self):
        response = self.client.get(
            f"/api/auth/users/{self.target_user.id}/"
        )

        self.assertEqual(
            response.status_code,
            401
        )

    def test_admin_get_invalid_user_detail(self):
        token = self.get_access_token(self.admin_user)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token}"
        )

        response = self.client.get(
            "/api/auth/users/99999/"
        )

        self.assertEqual(
            response.status_code,
            404
        )

        self.assertEqual(
            response.data["detail"],
            "User not found."
        )

class UserStatusAPITest(APITestCase):

    def setUp(self):
        self.client = APIClient()

        self.role_admin = Role.objects.get(
            name="Admin"
        )

        self.admin = User.objects.create_user(
            username="status_admin",
            email="status_admin@test.com",
            password="Test@12345",
            role=self.role_admin
        )

        self.target_user = User.objects.create_user(
            username="status_user",
            email="status_user@test.com",
            password="Test@12345",
            role=Role.objects.get(name="Employee")
        )

        self.client.force_authenticate(
            user=self.admin
        )

    def test_admin_can_deactivate_user(self):

        response = self.client.patch(
            f"/api/auth/users/{self.target_user.id}/status/",
            {
                "is_active": False
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        self.target_user.refresh_from_db()

        self.assertFalse(
            self.target_user.is_active
        )

    def test_admin_can_activate_user(self):

        self.target_user.is_active = False
        self.target_user.save()

        response = self.client.patch(
            f"/api/auth/users/{self.target_user.id}/status/",
            {
                "is_active": True
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        self.target_user.refresh_from_db()

        self.assertTrue(
            self.target_user.is_active
        )


    def test_manager_cannot_change_user_status(self):
        manager = User.objects.create_user(
            username="status_manager",
            email="status_manager@test.com",
            password="Test@12345",
            role=Role.objects.get(name="Manager")
        )

        self.client.force_authenticate(
            user=manager
        )

        response = self.client.patch(
            f"/api/auth/users/{self.target_user.id}/status/",
            {
                "is_active": False
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN
        )


    def test_employee_cannot_change_user_status(self):

        employee = User.objects.create_user(
            username="status_employee",
            email="status_employee@test.com",
            password="Test@12345",
            role=Role.objects.get(name="Employee")
        )

        self.client.force_authenticate(
            user=employee
        )

        response = self.client.patch(
            f"/api/auth/users/{self.target_user.id}/status/",
            {
                "is_active": False
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN
        )


    def test_unauthenticated_user_cannot_change_status(self):
        self.client.force_authenticate(user=None)
        response = self.client.patch(
            f"/api/auth/users/{self.target_user.id}/status/",
            {
                "is_active": False
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED
        )

    def test_invalid_user_id_returns_404(self):

        response = self.client.patch(
            "/api/auth/users/99999/status/",
            {
                "is_active": False
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND
        )


    def test_invalid_is_active_returns_400(self):

        response = self.client.patch(
            f"/api/auth/users/{self.target_user.id}/status/",
            {
                "is_active": "hello"
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST
        )

class ManagerAccessControlTest(APITestCase):

    def setUp(self):

        self.manager_role = Role.objects.get(
            name="Manager"
        )

        self.employee_role = Role.objects.get(
            name="Employee"
        )

        self.manager_user = User.objects.create_user(
            username="manager_access",
            email="manager_access@test.com",
            password="Test@12345",
            role=self.manager_role
        )

        self.employee_user = User.objects.create_user(
            username="employee_access",
            email="employee_access@test.com",
            password="Test@12345",
            role=self.employee_role
        )

    def test_manager_can_view_team_reports(self):

        self.assertTrue(
            has_permission(
                self.manager_user,
                "view_team_reports"
            )
        )

    def test_manager_can_use_ai_assistant(self):

        self.assertTrue(
            has_permission(
                self.manager_user,
                "use_ai_assistant"
            )
        )

    def test_manager_can_upload_documents(self):

        self.assertTrue(
            has_permission(
                self.manager_user,
                "upload_documents"
            )
        )

    def test_manager_can_view_own_documents(self):

        self.assertTrue(
            has_permission(
                self.manager_user,
                "view_own_documents"
            )
        )

    def test_manager_can_analyze_data(self):

        self.assertTrue(
            has_permission(
                self.manager_user,
                "analyze_data"
            )
        )

    def test_manager_can_generate_reports(self):

        self.assertTrue(
            has_permission(
                self.manager_user,
                "generate_reports"
            )
        )

    def test_manager_cannot_manage_users(self):

        self.assertFalse(
            has_permission(
                self.manager_user,
                "manage_users"
            )
        )

    def test_manager_cannot_assign_roles(self):

        self.assertFalse(
            has_permission(
                self.manager_user,
                "assign_roles"
            )
        )

    def test_employee_cannot_view_team_reports(self):

        self.assertFalse(
            has_permission(
                self.employee_user,
                "view_team_reports"
            )
        )