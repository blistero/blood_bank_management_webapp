from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import DonationCamp, CampStatus
from .serializers import (
    DonationCampSerializer,
    DonationCampCreateSerializer,
    DonationCampUpdateSerializer,
)
from .permissions import IsAdminStaffOrHospital, IsOrganizerOrAdminStaff


class CampListView(generics.ListAPIView):
    """All authenticated users: paginated camp list with city/status filters."""
    serializer_class = DonationCampSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "city", "state"]
    search_fields = ["title", "hospital_name", "city", "address"]
    ordering_fields = ["start_date", "created_at"]
    ordering = ["start_date"]

    def get_queryset(self):
        # Refresh statuses before listing
        qs = DonationCamp.objects.select_related("organizer").all()
        to_update = []
        for camp in qs:
            old = camp.status
            camp.auto_update_status()
            if camp.status != old:
                to_update.append(camp)
        if to_update:
            DonationCamp.objects.bulk_update(to_update, ["status"])
        return DonationCamp.objects.select_related("organizer").all()


class CampNearbyView(generics.ListAPIView):
    """Filter by city (case-insensitive); returns UPCOMING + LIVE camps."""
    serializer_class = DonationCampSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        city = self.request.query_params.get("city", "").strip()
        qs = DonationCamp.objects.select_related("organizer").filter(
            status__in=[CampStatus.UPCOMING, CampStatus.LIVE]
        )
        if city:
            qs = qs.filter(city__icontains=city)
        return qs.order_by("start_date", "start_time")


class CampCreateView(generics.CreateAPIView):
    """Admin / Staff / Hospital can create a camp."""
    serializer_class = DonationCampCreateSerializer
    permission_classes = [IsAdminStaffOrHospital]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        camp = serializer.save()
        return Response(
            DonationCampSerializer(camp, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class CampDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET:    any authenticated user
    PATCH:  organizer, admin, or staff
    DELETE: organizer, admin, or staff
    """
    queryset = DonationCamp.objects.select_related("organizer").all()
    permission_classes = [IsAuthenticated, IsOrganizerOrAdminStaff]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return DonationCampUpdateSerializer
        return DonationCampSerializer

    def destroy(self, request, *args, **kwargs):
        camp = self.get_object()
        camp.delete()
        return Response({"message": "Camp deleted."}, status=status.HTTP_200_OK)


class LiveCampsView(generics.ListAPIView):
    """Returns today's LIVE camps — used by dashboard widget."""
    serializer_class = DonationCampSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        from datetime import date
        return DonationCamp.objects.select_related("organizer").filter(
            status=CampStatus.LIVE,
            start_date__lte=date.today(),
            end_date__gte=date.today(),
        ).order_by("start_time")
