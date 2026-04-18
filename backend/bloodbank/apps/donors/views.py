from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from bloodbank.apps.accounts.permissions import IsAdmin, IsAdminOrStaff
from .models import DonorProfile
from .serializers import (
    DonorListSerializer,
    DonorProfileCreateSerializer,
    DonorProfileSerializer,
    DonorProfileSetupSerializer,
    DonorProfileUpdateSerializer,
)
from .filters import DonorFilter


class DonorListView(generics.ListAPIView):
    """
    Admin/Staff: list all donors.
    Supports filtering by blood_group, city, is_eligible, is_available.
    Supports searching by name and email.
    """
    serializer_class = DonorListSerializer
    permission_classes = [IsAdminOrStaff]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = DonorFilter
    search_fields = ["user__first_name", "user__last_name", "user__email", "city"]
    ordering_fields = ["created_at", "blood_group", "city"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return DonorProfile.objects.select_related("user").all()


class DonorCreateView(generics.CreateAPIView):
    """Authenticated donor creates their own profile (one per user)."""
    serializer_class = DonorProfileCreateSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        if DonorProfile.objects.filter(user=request.user).exists():
            return Response(
                {"detail": "Donor profile already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().create(request, *args, **kwargs)


class DonorDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET:    Owner or Admin/Staff — retrieve full profile.
    PATCH:  Owner — update allowed fields.
    DELETE: Admin only — soft-delete (sets is_available=False).
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return DonorProfileUpdateSerializer
        return DonorProfileSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role in ("ADMIN", "STAFF"):
            return DonorProfile.objects.select_related("user").all()
        return DonorProfile.objects.select_related("user").filter(user=user)

    def destroy(self, request, *args, **kwargs):
        if not request.user.role == "ADMIN":
            return Response(
                {"detail": "Only admins can remove donor profiles."},
                status=status.HTTP_403_FORBIDDEN,
            )
        donor = self.get_object()
        donor.is_available = False
        donor.save()
        return Response({"message": "Donor marked as unavailable."}, status=status.HTTP_200_OK)


class MyDonorProfileView(generics.RetrieveUpdateAPIView):
    """Shortcut — logged-in donor reads/updates their own profile without knowing the PK."""
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            # Route to setup serializer when the profile is not yet complete
            profile, _ = DonorProfile.objects.get_or_create(user=self.request.user)
            if not profile.is_complete:
                return DonorProfileSetupSerializer
            return DonorProfileUpdateSerializer
        return DonorProfileSerializer

    def get_object(self):
        # Use get_or_create so that legacy accounts (created before the auto-create signal)
        # always get a profile returned rather than a 404.
        profile, _ = DonorProfile.objects.select_related("user").get_or_create(
            user=self.request.user,
        )
        return profile


class EligibleDonorsByBloodGroupView(generics.ListAPIView):
    """
    Public-facing search: find eligible donors by blood_group.
    Optionally filter by city. Returns only is_eligible=True donors.
    Used by hospitals to find matching donors quickly.
    """
    serializer_class = DonorListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter]
    search_fields = ["city"]

    def get_queryset(self):
        blood_group = self.kwargs.get("blood_group")
        city = self.request.query_params.get("city", "")
        qs = DonorProfile.objects.select_related("user").filter(
            blood_group=blood_group,
            is_available=True,
        )
        if city:
            qs = qs.filter(city__icontains=city)
        # Filter eligible in Python since is_eligible is a property
        eligible_ids = [d.id for d in qs if d.is_eligible]
        return DonorProfile.objects.select_related("user").filter(id__in=eligible_ids)


class UpdateLastDonationView(APIView):
    """Admin/Staff record a donation date for a donor after a successful donation."""
    permission_classes = [IsAdminOrStaff]

    def patch(self, request, pk):
        from datetime import date as date_type
        from rest_framework.exceptions import ValidationError

        try:
            donor = DonorProfile.objects.get(pk=pk)
        except DonorProfile.DoesNotExist:
            return Response({"detail": "Donor not found."}, status=status.HTTP_404_NOT_FOUND)

        donation_date_raw = request.data.get("last_donation_date")
        if not donation_date_raw:
            return Response(
                {"detail": "last_donation_date is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            from datetime import datetime
            donation_date = datetime.strptime(str(donation_date_raw), "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"detail": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if donation_date > date_type.today():
            return Response(
                {"detail": "Donation date cannot be in the future."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        donor.last_donation_date = donation_date
        donor.save()
        return Response(
            DonorProfileSerializer(donor).data,
            status=status.HTTP_200_OK,
        )
