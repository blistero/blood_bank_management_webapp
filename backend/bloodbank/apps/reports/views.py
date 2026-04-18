from datetime import date, timedelta

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from bloodbank.apps.accounts.permissions import IsAdminOrStaff
from bloodbank.apps.donations.models import Donation, DonationStatus
from bloodbank.apps.donors.models import DonorProfile
from bloodbank.apps.inventory.models import BloodUnit, UnitStatus
from bloodbank.apps.requests.models import BloodRequest, RequestStatus

from .serializers import (
    DashboardSerializer,
    DonationByBloodGroupSerializer,
    DonationByStatusSerializer,
    DonationTrendSerializer,
    DonorsByBloodGroupSerializer,
    DonorsByCitySerializer,
    ExpiringUnitsSerializer,
    InventoryByBloodGroupSerializer,
    RequestsByBloodGroupSerializer,
    RequestsByStatusSerializer,
    RequestTrendSerializer,
)


def _parse_date_range(request):
    """Helper: extract validated start/end dates from query params."""
    today = date.today()
    try:
        start = date.fromisoformat(request.query_params.get("start_date", ""))
    except ValueError:
        start = today.replace(day=1)  # first day of current month
    try:
        end = date.fromisoformat(request.query_params.get("end_date", ""))
    except ValueError:
        end = today
    return start, end


# ── Dashboard ──────────────────────────────────────────────────────────────

class DashboardView(APIView):
    """
    Single endpoint that aggregates key KPIs for the admin dashboard.
    Uses select_related-free COUNT queries to stay fast.
    """
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        today = date.today()
        month_start = today.replace(day=1)
        expiry_cutoff = today + timedelta(days=7)

        donor_ids = list(DonorProfile.objects.filter(is_available=True).values_list("id", flat=True))
        eligible_count = sum(
            1 for d in DonorProfile.objects.filter(is_available=True)
            if d.is_eligible
        )

        data = {
            "total_donors": DonorProfile.objects.count(),
            "eligible_donors": eligible_count,
            "total_blood_units": BloodUnit.objects.count(),
            "available_units": BloodUnit.objects.filter(status=UnitStatus.AVAILABLE).count(),
            "expiring_soon_units": BloodUnit.objects.filter(
                status=UnitStatus.AVAILABLE,
                expiry_date__lte=expiry_cutoff,
                expiry_date__gte=today,
            ).count(),
            "pending_requests": BloodRequest.objects.filter(status=RequestStatus.PENDING).count(),
            "critical_requests": BloodRequest.objects.filter(
                status__in=[RequestStatus.PENDING, RequestStatus.APPROVED],
                urgency="CRITICAL",
            ).count(),
            "total_donations_this_month": Donation.objects.filter(
                donation_date__gte=month_start,
                status=DonationStatus.COMPLETED,
            ).count(),
            "fulfilled_requests_this_month": BloodRequest.objects.filter(
                updated_at__date__gte=month_start,
                status=RequestStatus.FULFILLED,
            ).count(),
        }

        serializer = DashboardSerializer(data)
        return Response(serializer.data)


# ── Donation Reports ───────────────────────────────────────────────────────

class DonationByStatusView(APIView):
    """Breakdown of donations by status."""
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        start, end = _parse_date_range(request)
        rows = (
            Donation.objects
            .filter(scheduled_date__range=[start, end])
            .values("status")
            .annotate(count=Count("id"))
            .order_by("status")
        )
        serializer = DonationByStatusSerializer(list(rows), many=True)
        return Response(serializer.data)


class DonationByBloodGroupView(APIView):
    """Completed donations grouped by blood group with total volume."""
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        start, end = _parse_date_range(request)
        rows = (
            Donation.objects
            .filter(
                status=DonationStatus.COMPLETED,
                donation_date__range=[start, end],
            )
            .values("blood_group")
            .annotate(count=Count("id"), total_volume_ml=Sum("volume_ml"))
            .order_by("blood_group")
        )
        serializer = DonationByBloodGroupSerializer(list(rows), many=True)
        return Response(serializer.data)


class DonationTrendView(APIView):
    """Monthly completed donation counts and volume over a date range."""
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        start, end = _parse_date_range(request)
        rows = (
            Donation.objects
            .filter(
                status=DonationStatus.COMPLETED,
                donation_date__range=[start, end],
            )
            .annotate(month=TruncMonth("donation_date"))
            .values("month")
            .annotate(count=Count("id"), total_volume_ml=Sum("volume_ml"))
            .order_by("month")
        )
        results = [
            {
                "month": r["month"].strftime("%Y-%m"),
                "count": r["count"],
                "total_volume_ml": r["total_volume_ml"] or 0,
            }
            for r in rows
        ]
        serializer = DonationTrendSerializer(results, many=True)
        return Response(serializer.data)


# ── Inventory Reports ──────────────────────────────────────────────────────

class InventoryByBloodGroupView(APIView):
    """Current stock grouped by blood_group + component_type with status counts."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = (
            BloodUnit.objects
            .values("blood_group", "component_type")
            .annotate(
                available=Count("id", filter=Q(status=UnitStatus.AVAILABLE)),
                reserved=Count("id", filter=Q(status=UnitStatus.RESERVED)),
                expired=Count("id", filter=Q(status=UnitStatus.EXPIRED)),
                total_volume_ml=Sum(
                    "volume_ml", filter=Q(status=UnitStatus.AVAILABLE)
                ),
            )
            .order_by("blood_group", "component_type")
        )
        results = [
            {**r, "total_volume_ml": r["total_volume_ml"] or 0}
            for r in rows
        ]
        serializer = InventoryByBloodGroupSerializer(results, many=True)
        return Response(serializer.data)


class ExpiringUnitsView(APIView):
    """Units expiring within N days (default 7). Used for urgent action alerts."""
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        today = date.today()
        try:
            days = int(request.query_params.get("days", 7))
            days = max(1, min(days, 90))
        except ValueError:
            days = 7

        cutoff = today + timedelta(days=days)
        units = BloodUnit.objects.filter(
            status=UnitStatus.AVAILABLE,
            expiry_date__gte=today,
            expiry_date__lte=cutoff,
        ).order_by("expiry_date")

        results = [
            {
                "id": u.id,
                "batch_number": u.batch_number,
                "blood_group": u.blood_group,
                "component_type": u.component_type,
                "expiry_date": u.expiry_date,
                "days_to_expiry": u.days_to_expiry,
                "storage_location": u.storage_location,
            }
            for u in units
        ]
        serializer = ExpiringUnitsSerializer(results, many=True)
        return Response(serializer.data)


# ── Donor Reports ──────────────────────────────────────────────────────────

class DonorsByBloodGroupView(APIView):
    """Donor counts per blood group with eligibility breakdown."""
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        rows = (
            DonorProfile.objects
            .values("blood_group")
            .annotate(
                total=Count("id"),
                unavailable=Count("id", filter=Q(is_available=False)),
            )
            .order_by("blood_group")
        )
        results = []
        for row in rows:
            eligible = sum(
                1 for d in DonorProfile.objects.filter(blood_group=row["blood_group"], is_available=True)
                if d.is_eligible
            )
            results.append({**row, "eligible": eligible})

        serializer = DonorsByBloodGroupSerializer(results, many=True)
        return Response(serializer.data)


class DonorsByCityView(APIView):
    """Donor counts per city with eligible count. Supports ?city= prefix filter."""
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        city_filter = request.query_params.get("city", "")
        qs = DonorProfile.objects.filter(is_available=True)
        if city_filter:
            qs = qs.filter(city__icontains=city_filter)

        rows = (
            qs.values("city")
            .annotate(total=Count("id"))
            .order_by("-total")[:20]
        )
        results = []
        for row in rows:
            eligible = sum(
                1 for d in DonorProfile.objects.filter(city=row["city"], is_available=True)
                if d.is_eligible
            )
            results.append({**row, "eligible": eligible})

        serializer = DonorsByCitySerializer(results, many=True)
        return Response(serializer.data)


# ── Request Reports ────────────────────────────────────────────────────────

class RequestsByStatusView(APIView):
    """Blood request counts grouped by status."""
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        start, end = _parse_date_range(request)
        rows = (
            BloodRequest.objects
            .filter(created_at__date__range=[start, end])
            .values("status")
            .annotate(count=Count("id"))
            .order_by("status")
        )
        serializer = RequestsByStatusSerializer(list(rows), many=True)
        return Response(serializer.data)


class RequestsByBloodGroupView(APIView):
    """Request fulfilment rates per blood group."""
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        start, end = _parse_date_range(request)
        rows = (
            BloodRequest.objects
            .filter(created_at__date__range=[start, end])
            .values("blood_group")
            .annotate(
                total=Count("id"),
                fulfilled=Count("id", filter=Q(status=RequestStatus.FULFILLED)),
                pending=Count("id", filter=Q(status=RequestStatus.PENDING)),
                rejected=Count("id", filter=Q(status=RequestStatus.REJECTED)),
            )
            .order_by("blood_group")
        )
        serializer = RequestsByBloodGroupSerializer(list(rows), many=True)
        return Response(serializer.data)


class RequestTrendView(APIView):
    """Monthly request volume and fulfilment counts."""
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        start, end = _parse_date_range(request)
        rows = (
            BloodRequest.objects
            .filter(created_at__date__range=[start, end])
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(
                total=Count("id"),
                fulfilled=Count("id", filter=Q(status=RequestStatus.FULFILLED)),
            )
            .order_by("month")
        )
        results = [
            {
                "month": r["month"].strftime("%Y-%m"),
                "total": r["total"],
                "fulfilled": r["fulfilled"],
            }
            for r in rows
        ]
        serializer = RequestTrendSerializer(results, many=True)
        return Response(serializer.data)
