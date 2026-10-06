from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import User, Role
from .models import Report


class TeamReportsAPITest(APITestCase):

    def setUp(self):

        self.manager_role = Role.objects.get(
            name="Manager"
        )

        self.employee_role = Role.objects.get(
            name="Employee"
        )

        self.manager_user = User.objects.create_user(
            username="report_manager",
            email="report_manager@test.com",
            password="Test@12345",
            role=self.manager_role
        )

        self.employee_user = User.objects.create_user(
            username="report_employee",
            email="report_employee@test.com",
            password="Test@12345",
            role=self.employee_role,
            manager=self.manager_user
        )

        self.other_manager = User.objects.create_user(
            username="other_manager",
            email="other_manager@test.com",
            password="Test@12345",
            role=self.manager_role
        )

        self.other_employee = User.objects.create_user(
            username="other_employee",
            email="other_employee@test.com",
            password="Test@12345",
            role=self.employee_role,
            manager=self.other_manager
        )

    def get_access_token(self, user):

        refresh = RefreshToken.for_user(user)

        return str(refresh.access_token)

    def test_manager_can_view_team_reports(self):

        report = Report.objects.create(
            employee=self.employee_user,
            title="Employee Weekly Report",
            description="Weekly work report"
        )

        token = self.get_access_token(
            self.manager_user
        )

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token}"
        )

        response = self.client.get(
            "/api/reports/team/"
        )

        self.assertEqual(
            response.status_code,
            200
        )

        self.assertEqual(
            len(response.data),
            1
        )

        self.assertEqual(
            response.data[0]["id"],
            report.id
        )

    def test_manager_sees_only_own_team_reports(self):

        own_report = Report.objects.create(
            employee=self.employee_user,
            title="Own Team Report",
            description="Report from own team"
        )

        other_report = Report.objects.create(
            employee=self.other_employee,
            title="Other Team Report",
            description="Report from another team"
        )

        token = self.get_access_token(
            self.manager_user
        )

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token}"
        )

        response = self.client.get(
            "/api/reports/team/"
        )

        self.assertEqual(
            response.status_code,
            200
        )

        report_ids = [
            report["id"]
            for report in response.data
        ]

        self.assertIn(
            own_report.id,
            report_ids
        )

        self.assertNotIn(
            other_report.id,
            report_ids
        )

    def test_employee_cannot_view_team_reports(self):

        token = self.get_access_token(
            self.employee_user
        )

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token}"
        )

        response = self.client.get(
            "/api/reports/team/"
        )

        self.assertEqual(
            response.status_code,
            403
        )

    def test_unauthenticated_user_cannot_view_team_reports(self):

        response = self.client.get(
            "/api/reports/team/"
        )

        self.assertEqual(
            response.status_code,
            401
        )

    def test_manager_with_no_reports_gets_empty_list(self):

        token = self.get_access_token(
            self.manager_user
        )

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token}"
        )

        response = self.client.get(
            "/api/reports/team/"
        )

        self.assertEqual(
            response.status_code,
            200
        )

        self.assertEqual(
            response.data,
            []
        )
