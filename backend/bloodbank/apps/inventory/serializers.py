from datetime import date

from rest_framework import serializers

from .models import BloodUnit, UnitStatus


class BloodUnitSerializer(serializers.ModelSerializer):
    """Full detail serializer used for retrieve and admin views."""
    is_expired = serializers.ReadOnlyField()
    days_to_expiry = serializers.ReadOnlyField()
    is_critical = serializers.ReadOnlyField()
    blood_group_display = serializers.CharField(source="get_blood_group_display", read_only=True)
    component_type_display = serializers.CharField(source="get_component_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    recorded_by_name = serializers.CharField(source="recorded_by.full_name", read_only=True)
    donor_name = serializers.CharField(source="donor.user.full_name", read_only=True)

    class Meta:
        model = BloodUnit
        fields = (
            "id", "batch_number",
            "blood_group", "blood_group_display",
            "component_type", "component_type_display",
            "volume_ml", "collected_date", "expiry_date",
            "status", "status_display",
            "storage_location", "donor", "donor_name",
            "recorded_by", "recorded_by_name",
            "notes", "is_expired", "days_to_expiry", "is_critical",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at", "recorded_by")


class BloodUnitCreateSerializer(serializers.ModelSerializer):
    """Used when staff adds a new blood unit to inventory."""

    class Meta:
        model = BloodUnit
        fields = (
            "batch_number", "blood_group", "component_type",
            "volume_ml", "collected_date", "expiry_date",
            "storage_location", "donor", "notes",
        )
        extra_kwargs = {
            "expiry_date": {"required": False},  # auto-calculated if omitted
        }

    def validate_collected_date(self, value):
        if value > date.today():
            raise serializers.ValidationError("Collection date cannot be in the future.")
        return value

    def validate(self, attrs):
        collected = attrs.get("collected_date")
        expiry = attrs.get("expiry_date")
        if expiry and collected and expiry <= collected:
            raise serializers.ValidationError(
                {"expiry_date": "Expiry date must be after collection date."}
            )
        return attrs

    def create(self, validated_data):
        validated_data["recorded_by"] = self.context["request"].user
        return super().create(validated_data)


class BloodUnitStatusUpdateSerializer(serializers.ModelSerializer):
    """Lightweight serializer — only allows updating the status field."""

    class Meta:
        model = BloodUnit
        fields = ("status", "notes")

    def validate_status(self, value):
        instance = self.instance
        if instance and instance.status == UnitStatus.USED:
            raise serializers.ValidationError("A used unit cannot be updated.")
        if instance and instance.status == UnitStatus.DISCARDED:
            raise serializers.ValidationError("A discarded unit cannot be updated.")
        return value


class BloodUnitListSerializer(serializers.ModelSerializer):
    """Lightweight list serializer for paginated views."""
    is_critical = serializers.ReadOnlyField()
    days_to_expiry = serializers.ReadOnlyField()

    class Meta:
        model = BloodUnit
        fields = (
            "id", "batch_number", "blood_group", "component_type",
            "volume_ml", "status", "expiry_date",
            "days_to_expiry", "is_critical", "storage_location",
        )


class StockSummarySerializer(serializers.Serializer):
    """Aggregated stock levels per blood group — used in dashboard."""
    blood_group = serializers.CharField()
    component_type = serializers.CharField()
    total_units = serializers.IntegerField()
    available_units = serializers.IntegerField()
    reserved_units = serializers.IntegerField()
    critical_units = serializers.IntegerField()
    total_volume_ml = serializers.IntegerField()
