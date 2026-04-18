from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from bloodbank.apps.accounts.permissions import IsAdminOrStaff, IsHospital
from bloodbank.apps.inventory.models import BloodUnit
from .filters import BloodRequestFilter
from .models import BloodRequest, RequestStatus
from .serializers import (
    BloodRequestCreateSerializer,
    BloodRequestListSerializer,
    BloodRequestSerializer,
    BloodRequestUpdateSerializer,
    RequestFulfilSerializer,
    RequestRejectSerializer,
)


class BloodRequestListView(generics.ListAPIView):
    """
    Admin/Staff: full list of all requests.
    Hospital: see only their own requests.
    """
    serializer_class = BloodRequestListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = BloodRequestFilter
    search_fields = ["patient_name", "requested_by__first_name", "requested_by__last_name"]
    ordering_fields = ["created_at", "required_by_date", "urgency", "status"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = BloodRequest.objects.select_related("requested_by", "reviewed_by")
        if user.role in ("ADMIN", "STAFF"):
            return qs.all()
        return qs.filter(requested_by=user)


class BloodRequestCreateView(generics.CreateAPIView):
    """Hospital submits a new blood request."""
    serializer_class = BloodRequestCreateSerializer
    permission_classes = [IsHospital]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        blood_request = serializer.save()
        return Response(
            BloodRequestSerializer(blood_request, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class BloodRequestDetailView(generics.RetrieveUpdateAPIView):
    """
    GET:   Owner (hospital) or Admin/Staff.
    PATCH: Owner — only allowed while PENDING.
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return BloodRequestUpdateSerializer
        return BloodRequestSerializer

    def get_queryset(self):
        user = self.request.user
        qs = BloodRequest.objects.prefetch_related("assigned_units").select_related(
            "requested_by", "reviewed_by"
        )
        if user.role in ("ADMIN", "STAFF"):
            return qs.all()
        return qs.filter(requested_by=user)

    def update(self, request, *args, **kwargs):
        # Only the owner hospital can edit
        instance = self.get_object()
        if instance.requested_by != request.user:
            return Response(
                {"detail": "You can only edit your own requests."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)


class RequestApproveView(APIView):
    """Admin/Staff: approve a PENDING blood request."""
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        try:
            blood_request = BloodRequest.objects.get(pk=pk)
        except BloodRequest.DoesNotExist:
            return Response({"detail": "Request not found."}, status=status.HTTP_404_NOT_FOUND)

        if blood_request.status != RequestStatus.PENDING:
            return Response(
                {"detail": f"Only PENDING requests can be approved. Current: {blood_request.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        blood_request.approve(reviewed_by=request.user)
        return Response(
            BloodRequestSerializer(blood_request, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class RequestRejectView(APIView):
    """Admin/Staff: reject a PENDING request with a reason."""
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        try:
            blood_request = BloodRequest.objects.get(pk=pk)
        except BloodRequest.DoesNotExist:
            return Response({"detail": "Request not found."}, status=status.HTTP_404_NOT_FOUND)

        if blood_request.status != RequestStatus.PENDING:
            return Response(
                {"detail": "Only PENDING requests can be rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = RequestRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        blood_request.reject(
            reviewed_by=request.user,
            reason=serializer.validated_data["rejection_reason"],
        )
        return Response(
            BloodRequestSerializer(blood_request, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class RequestFulfilView(APIView):
    """
    Admin/Staff: assign available BloodUnits to an APPROVED request.
    Can be called multiple times until units_required is met.
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        try:
            blood_request = BloodRequest.objects.prefetch_related("assigned_units").get(pk=pk)
        except BloodRequest.DoesNotExist:
            return Response({"detail": "Request not found."}, status=status.HTTP_404_NOT_FOUND)

        if blood_request.status not in (
            RequestStatus.APPROVED, RequestStatus.PARTIALLY_FULFILLED
        ):
            return Response(
                {"detail": "Request must be APPROVED or PARTIALLY_FULFILLED to fulfil."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = RequestFulfilSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        unit_ids = serializer.validated_data["unit_ids"]

        # Validate blood group match
        units = list(BloodUnit.objects.filter(pk__in=unit_ids))
        wrong_group = [u.batch_number for u in units if u.blood_group != blood_request.blood_group]
        if wrong_group:
            return Response(
                {
                    "detail": (
                        f"Units {wrong_group} have a different blood group than requested "
                        f"({blood_request.blood_group})."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Guard against over-fulfilment
        if len(units) > blood_request.units_remaining:
            return Response(
                {
                    "detail": (
                        f"Only {blood_request.units_remaining} more unit(s) needed. "
                        f"{len(units)} provided."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            blood_request.fulfil(units=units, reviewed_by=request.user)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            BloodRequestSerializer(blood_request, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class RequestCancelView(APIView):
    """Hospital cancels their own PENDING request."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            blood_request = BloodRequest.objects.get(pk=pk)
        except BloodRequest.DoesNotExist:
            return Response({"detail": "Request not found."}, status=status.HTTP_404_NOT_FOUND)

        if blood_request.requested_by != request.user and request.user.role not in ("ADMIN", "STAFF"):
            return Response(
                {"detail": "You can only cancel your own requests."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if blood_request.status not in (RequestStatus.PENDING, RequestStatus.APPROVED):
            return Response(
                {"detail": "Only PENDING or APPROVED requests can be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        blood_request.status = RequestStatus.CANCELLED
        blood_request.save(update_fields=["status", "updated_at"])
        return Response(
            BloodRequestSerializer(blood_request, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )
