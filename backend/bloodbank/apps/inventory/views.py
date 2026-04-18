from datetime import date

from django.db.models import Count, Q, Sum
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from bloodbank.apps.accounts.permissions import IsAdminOrStaff
from .filters import BloodUnitFilter
from .models import BloodUnit, UnitStatus
from .serializers import (
    BloodUnitCreateSerializer,
    BloodUnitListSerializer,
    BloodUnitSerializer,
    BloodUnitStatusUpdateSerializer,
    StockSummarySerializer,
)


class BloodUnitListView(generics.ListAPIView):
    """Admin/Staff: list all blood units with filtering and search."""
    serializer_class = BloodUnitListSerializer
    permission_classes = [IsAdminOrStaff]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = BloodUnitFilter
    search_fields = ["batch_number", "storage_location", "donor__user__first_name"]
    ordering_fields = ["expiry_date", "collected_date", "blood_group", "status"]
    ordering = ["expiry_date"]

    def get_queryset(self):
        return BloodUnit.objects.select_related("donor__user", "recorded_by").all()


class BloodUnitCreateView(generics.CreateAPIView):
    """Admin/Staff: add a new blood unit to inventory."""
    serializer_class = BloodUnitCreateSerializer
    permission_classes = [IsAdminOrStaff]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        unit = serializer.save()
        return Response(
            BloodUnitSerializer(unit, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class BloodUnitDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET:    Admin/Staff — full unit details.
    PATCH:  Admin/Staff — update status or notes.
    DELETE: Admin only — hard delete (audit trail is in DB logs).
    """
    permission_classes = [IsAdminOrStaff]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return BloodUnitStatusUpdateSerializer
        return BloodUnitSerializer

    def get_queryset(self):
        return BloodUnit.objects.select_related("donor__user", "recorded_by").all()

    def destroy(self, request, *args, **kwargs):
        if request.user.role != "ADMIN":
            return Response(
                {"detail": "Only admins can delete blood units."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)


class StockSummaryView(APIView):
    """
    Aggregated stock dashboard — returns available units grouped by
    blood_group + component_type with critical counts.
    Accessible to Admin, Staff, and Hospital roles.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()

        rows = (
            BloodUnit.objects
            .filter(status__in=[UnitStatus.AVAILABLE, UnitStatus.RESERVED])
            .values("blood_group", "component_type")
            .annotate(
                total_units=Count("id"),
                available_units=Count("id", filter=Q(status=UnitStatus.AVAILABLE)),
                reserved_units=Count("id", filter=Q(status=UnitStatus.RESERVED)),
                total_volume_ml=Sum("volume_ml"),
            )
            .order_by("blood_group", "component_type")
        )

        results = []
        for row in rows:
            # Count critical (expiring ≤ 3 days) for this group in Python
            critical = BloodUnit.objects.filter(
                blood_group=row["blood_group"],
                component_type=row["component_type"],
                status=UnitStatus.AVAILABLE,
                expiry_date__lte=today,
            ).count()
            results.append({**row, "critical_units": critical})

        serializer = StockSummarySerializer(results, many=True)
        return Response(serializer.data)


class MarkExpiredView(APIView):
    """
    Admin/Staff: batch-mark all overdue AVAILABLE units as EXPIRED.
    Run this as a scheduled job or manually from the dashboard.
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request):
        today = date.today()
        updated = BloodUnit.objects.filter(
            expiry_date__lt=today,
            status=UnitStatus.AVAILABLE,
        ).update(status=UnitStatus.EXPIRED)
        return Response(
            {"message": f"{updated} unit(s) marked as expired."},
            status=status.HTTP_200_OK,
        )


class BloodAvailabilityView(generics.ListAPIView):
    """
    Public-ish: return available units for a specific blood group.
    Used by hospital role to check availability before making a request.
    """
    serializer_class = BloodUnitListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        blood_group = self.kwargs["blood_group"]
        return BloodUnit.objects.filter(
            blood_group=blood_group,
            status=UnitStatus.AVAILABLE,
            expiry_date__gte=date.today(),
        ).order_by("expiry_date")
