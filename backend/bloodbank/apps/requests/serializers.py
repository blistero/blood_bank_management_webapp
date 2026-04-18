from datetime import date

from rest_framework import serializers

from bloodbank.apps.inventory.serializers import BloodUnitListSerializer
from .models import BloodRequest, RequestStatus


class BloodRequestSerializer(serializers.ModelSerializer):
    """Full detail — includes assigned units and all computed fields."""
    requested_by_name = serializers.CharField(source="requested_by.full_name", read_only=True)
    reviewed_by_name = serializers.CharField(source="reviewed_by.full_name", read_only=True)
    urgency_display = serializers.CharField(source="get_urgency_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    component_type_display = serializers.CharField(source="get_component_type_display", read_only=True)
    assigned_units_detail = BloodUnitListSerializer(source="assigned_units", many=True, read_only=True)
    units_remaining = serializers.ReadOnlyField()
    is_overdue = serializers.ReadOnlyField()

    class Meta:
        model = BloodRequest
        fields = (
            "id", "requested_by", "requested_by_name",
            "patient_name", "blood_group",
            "component_type", "component_type_display",
            "units_required", "units_fulfilled", "units_remaining",
            "urgency", "urgency_display",
            "required_by_date", "is_overdue",
            "status", "status_display",
            "assigned_units", "assigned_units_detail",
            "rejection_reason", "notes",
            "reviewed_by", "reviewed_by_name",
            "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "units_fulfilled", "assigned_units",
            "reviewed_by", "status", "created_at", "updated_at",
        )


class BloodRequestCreateSerializer(serializers.ModelSerializer):
    """Hospital submits a new blood request."""

    class Meta:
        model = BloodRequest
        fields = (
            "patient_name", "blood_group", "component_type",
            "units_required", "urgency", "required_by_date", "notes",
        )

    def validate_required_by_date(self, value):
        if value < date.today():
            raise serializers.ValidationError("Required by date cannot be in the past.")
        return value

    def validate_units_required(self, value):
        if value < 1:
            raise serializers.ValidationError("At least 1 unit must be requested.")
        if value > 20:
            raise serializers.ValidationError(
                "Cannot request more than 20 units at once. Submit multiple requests."
            )
        return value

    def create(self, validated_data):
        validated_data["requested_by"] = self.context["request"].user
        return super().create(validated_data)


class BloodRequestUpdateSerializer(serializers.ModelSerializer):
    """Hospital can edit a PENDING request before it is reviewed."""

    class Meta:
        model = BloodRequest
        fields = ("patient_name", "units_required", "urgency", "required_by_date", "notes")

    def validate(self, attrs):
        if self.instance and self.instance.status != RequestStatus.PENDING:
            raise serializers.ValidationError(
                "Only PENDING requests can be edited."
            )
        return attrs


class RequestRejectSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField(min_length=5)


class RequestFulfilSerializer(serializers.Serializer):
    """Staff provides a list of BloodUnit IDs to assign to this request."""
    unit_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        help_text="List of BloodUnit primary keys to assign.",
    )

    def validate_unit_ids(self, value):
        from bloodbank.apps.inventory.models import BloodUnit, UnitStatus
        units = BloodUnit.objects.filter(pk__in=value)
        if units.count() != len(value):
            found_ids = set(units.values_list("pk", flat=True))
            missing = set(value) - found_ids
            raise serializers.ValidationError(f"Units not found: {sorted(missing)}.")
        unavailable = units.exclude(status=UnitStatus.AVAILABLE)
        if unavailable.exists():
            bad = list(unavailable.values_list("batch_number", flat=True))
            raise serializers.ValidationError(f"These units are not available: {bad}.")
        return value


class BloodRequestListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for paginated list views."""
    requested_by_name = serializers.CharField(source="requested_by.full_name", read_only=True)
    units_remaining = serializers.ReadOnlyField()
    is_overdue = serializers.ReadOnlyField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    urgency_display = serializers.CharField(source="get_urgency_display", read_only=True)

    class Meta:
        model = BloodRequest
        fields = (
            "id", "requested_by_name", "patient_name",
            "blood_group", "component_type",
            "units_required", "units_fulfilled", "units_remaining",
            "urgency", "urgency_display",
            "required_by_date", "is_overdue",
            "status", "status_display",
            "created_at",
        )
