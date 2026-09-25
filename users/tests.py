from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, Role, Permission, RolePermission
from .serializers import RegisterSerializer, LoginSerializer


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

        self.assign_roles_permission = Permission.objects.get(
            name="assign_roles"
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
# Create your tests here.
