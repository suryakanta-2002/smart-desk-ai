from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from users.permissions import has_permission
from .models import Report
from .serializers import ReportSerializer


class TeamReportsView(APIView):

    def get(self, request):

        if not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not has_permission(request.user, "view_team_reports"):
            return Response(
                {"detail": "You do not have permission to view team reports."},
                status=status.HTTP_403_FORBIDDEN
            )

        reports = Report.objects.filter(
            employee__manager=request.user
        ).select_related("employee")

        serializer = ReportSerializer(
            reports,
            many=True
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )