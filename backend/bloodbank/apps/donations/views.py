from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from bloodbank.apps.accounts.permissions import IsAdminOrStaff
from bloodbank.apps.inventory.serializers import BloodUnitSerializer
from .filters import DonationFilter
from .models import Donation, DonationStatus
from .serializers import (
    DonationCompleteSerializer,
    DonationListSerializer,
    DonationRejectSerializer,
    DonationScheduleSerializer,
    DonationSerializer,
)


class DonationListView(generics.ListAPIView):
    """Admin/Staff: list all donations with filtering."""
    serializer_class = DonationListSerializer
    permission_classes = [IsAdminOrStaff]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = DonationFilter
    search_fields = ["donor__user__first_name", "donor__user__last_name", "blood_group"]
    ordering_fields = ["scheduled_date", "donation_date", "status"]
    ordering = ["-scheduled_date"]

    def get_queryset(self):
        return Donation.objects.select_related(
            "donor__user", "blood_unit", "recorded_by"
        ).all()


class DonationScheduleView(generics.CreateAPIView):
    """Admin/Staff: schedule a donation appointment for an eligible donor."""
    serializer_class = DonationScheduleSerializer
    permission_classes = [IsAdminOrStaff]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        donation = serializer.save()
        return Response(
            DonationSerializer(donation, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class DonationDetailView(generics.RetrieveAPIView):
    """Retrieve full donation detail including linked blood unit."""
    serializer_class = DonationSerializer
    permission_classes = [IsAdminOrStaff]

    def get_queryset(self):
        return Donation.objects.select_related(
            "donor__user", "blood_unit", "recorded_by"
        ).all()


class DonationCompleteView(APIView):
    """
    Admin/Staff: mark a SCHEDULED donation as COMPLETED.
    Automatically creates a BloodUnit and updates donor eligibility.
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        try:
            donation = Donation.objects.select_related("donor").get(pk=pk)
        except Donation.DoesNotExist:
            return Response({"detail": "Donation not found."}, status=status.HTTP_404_NOT_FOUND)

        if donation.status != DonationStatus.SCHEDULED:
            return Response(
                {"detail": f"Only SCHEDULED donations can be completed. Current status: {donation.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = DonationCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        unit = donation.complete(
            donation_date=serializer.validated_data["donation_date"],
            storage_location=serializer.validated_data.get("storage_location", ""),
            recorded_by=request.user,
        )

        if serializer.validated_data.get("notes"):
            donation.notes = serializer.validated_data["notes"]
            donation.save(update_fields=["notes", "updated_at"])

        return Response(
            {
                "message": "Donation completed successfully.",
                "donation": DonationSerializer(donation, context={"request": request}).data,
                "blood_unit": BloodUnitSerializer(unit, context={"request": request}).data,
            },
            status=status.HTTP_200_OK,
        )


class DonationCancelView(APIView):
    """Admin/Staff: cancel a SCHEDULED donation."""
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        try:
            donation = Donation.objects.get(pk=pk)
        except Donation.DoesNotExist:
            return Response({"detail": "Donation not found."}, status=status.HTTP_404_NOT_FOUND)

        if donation.status != DonationStatus.SCHEDULED:
            return Response(
                {"detail": "Only SCHEDULED donations can be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = DonationRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        donation.status = DonationStatus.CANCELLED
        donation.rejection_reason = serializer.validated_data["rejection_reason"]
        donation.save(update_fields=["status", "rejection_reason", "updated_at"])

        return Response(
            DonationSerializer(donation, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class DonationRejectView(APIView):
    """Admin/Staff: reject a donation (donor medically unfit on the day)."""
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        try:
            donation = Donation.objects.get(pk=pk)
        except Donation.DoesNotExist:
            return Response({"detail": "Donation not found."}, status=status.HTTP_404_NOT_FOUND)

        if donation.status != DonationStatus.SCHEDULED:
            return Response(
                {"detail": "Only SCHEDULED donations can be rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = DonationRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        donation.status = DonationStatus.REJECTED
        donation.rejection_reason = serializer.validated_data["rejection_reason"]
        donation.save(update_fields=["status", "rejection_reason", "updated_at"])

        return Response(
            DonationSerializer(donation, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class MyDonationHistoryView(generics.ListAPIView):
    """Donor: view their own donation history."""
    serializer_class = DonationListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["status"]
    ordering = ["-scheduled_date"]

    def get_queryset(self):
        try:
            donor_profile = self.request.user.donor_profile
        except Exception:
            return Donation.objects.none()
        return Donation.objects.filter(donor=donor_profile).select_related(
            "donor__user", "blood_unit"
        )
