from datetime import date

from rest_framework import serializers

from bloodbank.apps.inventory.serializers import BloodUnitListSerializer
from .models import Donation, DonationStatus


class DonationSerializer(serializers.ModelSerializer):
    """Full read serializer with nested blood unit and computed fields."""
    donor_name = serializers.CharField(source="donor.user.full_name", read_only=True)
    donor_blood_group = serializers.CharField(source="donor.blood_group", read_only=True)
    recorded_by_name = serializers.CharField(source="recorded_by.full_name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    component_type_display = serializers.CharField(source="get_component_type_display", read_only=True)
    blood_unit_detail = BloodUnitListSerializer(source="blood_unit", read_only=True)

    class Meta:
        model = Donation
        fields = (
            "id", "donor", "donor_name", "donor_blood_group",
            "scheduled_date", "donation_date",
            "status", "status_display",
            "component_type", "component_type_display",
            "volume_ml", "blood_group",
            "blood_unit", "blood_unit_detail",
            "rejection_reason", "notes",
            "recorded_by", "recorded_by_name",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "blood_group", "blood_unit", "recorded_by", "created_at", "updated_at")


class DonationScheduleSerializer(serializers.ModelSerializer):
    """Schedule a donation appointment."""

    class Meta:
        model = Donation
        fields = ("donor", "scheduled_date", "component_type", "volume_ml", "notes")

    def validate_scheduled_date(self, value):
        if value < date.today():
            raise serializers.ValidationError("Scheduled date cannot be in the past.")
        return value

    def validate(self, attrs):
        from datetime import timedelta
        from bloodbank.apps.donors.models import DONATION_INTERVAL_DAYS

        donor = attrs.get("donor")
        scheduled_date = attrs.get("scheduled_date")

        if donor and not donor.is_available:
            raise serializers.ValidationError({"donor": "Donor is marked as unavailable."})

        if donor and donor.last_donation_date and scheduled_date:
            # Check eligibility on the scheduled date, not today
            days_since = (scheduled_date - donor.last_donation_date).days
            if days_since < DONATION_INTERVAL_DAYS:
                next_eligible = donor.last_donation_date + timedelta(days=DONATION_INTERVAL_DAYS)
                raise serializers.ValidationError(
                    {
                        "donor": (
                            f"Donor will not be eligible on {scheduled_date}. "
                            f"Next eligible date: {next_eligible}."
                        )
                    }
                )
        return attrs

    def create(self, validated_data):
        validated_data["recorded_by"] = self.context["request"].user
        return super().create(validated_data)


class DonationCompleteSerializer(serializers.Serializer):
    """Payload for completing a donation — triggers BloodUnit creation."""
    donation_date = serializers.DateField()
    storage_location = serializers.CharField(max_length=100, required=False, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_donation_date(self, value):
        if value > date.today():
            raise serializers.ValidationError("Donation date cannot be in the future.")
        return value


class DonationRejectSerializer(serializers.Serializer):
    """Payload for rejecting or cancelling a donation."""
    rejection_reason = serializers.CharField(min_length=5)


class DonationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for paginated list views."""
    donor_name = serializers.CharField(source="donor.user.full_name", read_only=True)
    donor_blood_group = serializers.CharField(source="donor.blood_group", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    component_type_display = serializers.CharField(source="get_component_type_display", read_only=True)
    recorded_by_name = serializers.SerializerMethodField()

    def get_recorded_by_name(self, obj):
        return obj.recorded_by.full_name if obj.recorded_by else ""

    class Meta:
        model = Donation
        fields = (
            "id", "donor", "donor_name", "donor_blood_group",
            "blood_group", "component_type", "component_type_display",
            "scheduled_date", "donation_date",
            "status", "status_display", "volume_ml",
            "recorded_by", "recorded_by_name",
        )
