from datetime import date

from rest_framework import serializers

from .models import DonationCamp


class DonationCampSerializer(serializers.ModelSerializer):
    organizer_name = serializers.CharField(source="organizer.full_name", read_only=True)
    organizer_role = serializers.CharField(source="organizer.role", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model  = DonationCamp
        fields = (
            "id", "title",
            "organizer", "organizer_name", "organizer_role",
            "hospital_name", "address", "city", "state",
            "latitude", "longitude",
            "start_date", "end_date", "start_time", "end_time",
            "contact_phone", "description",
            "status", "status_display",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "organizer", "created_at", "updated_at")


class DonationCampCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = DonationCamp
        fields = (
            "title", "hospital_name", "address", "city", "state",
            "latitude", "longitude",
            "start_date", "end_date", "start_time", "end_time",
            "contact_phone", "description", "status",
        )

    def validate(self, attrs):
        start = attrs.get("start_date")
        end   = attrs.get("end_date")
        if start and end and end < start:
            raise serializers.ValidationError({"end_date": "End date must be on or after start date."})
        if attrs.get("start_time") and attrs.get("end_time"):
            if start == end and attrs["end_time"] <= attrs["start_time"]:
                raise serializers.ValidationError(
                    {"end_time": "End time must be after start time for single-day camps."}
                )
        return attrs

    def create(self, validated_data):
        validated_data["organizer"] = self.context["request"].user
        camp = super().create(validated_data)
        camp.auto_update_status()
        camp.save(update_fields=["status"])
        return camp


class DonationCampUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = DonationCamp
        fields = (
            "title", "hospital_name", "address", "city", "state",
            "latitude", "longitude",
            "start_date", "end_date", "start_time", "end_time",
            "contact_phone", "description", "status",
        )

    def validate(self, attrs):
        instance = self.instance
        start = attrs.get("start_date", instance.start_date if instance else None)
        end   = attrs.get("end_date",   instance.end_date   if instance else None)
        if start and end and end < start:
            raise serializers.ValidationError({"end_date": "End date must be on or after start date."})
        return attrs

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        if "status" not in validated_data:
            instance.auto_update_status()
            instance.save(update_fields=["status", "updated_at"])
        return instance
