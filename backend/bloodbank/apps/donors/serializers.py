from rest_framework import serializers

from bloodbank.apps.accounts.serializers import UserProfileSerializer
from .models import DonorProfile


class DonorProfileSerializer(serializers.ModelSerializer):
    """Full read serializer — includes computed fields and nested user info."""
    user = UserProfileSerializer(read_only=True)
    is_eligible = serializers.ReadOnlyField()
    is_complete = serializers.ReadOnlyField()
    next_eligible_date = serializers.ReadOnlyField()
    days_until_eligible = serializers.ReadOnlyField()
    age = serializers.ReadOnlyField()
    blood_group_display = serializers.CharField(source="get_blood_group_display", read_only=True)
    gender_display = serializers.CharField(source="get_gender_display", read_only=True)

    class Meta:
        model = DonorProfile
        fields = (
            "id", "user",
            "blood_group", "blood_group_display",
            "date_of_birth", "age",
            "gender", "gender_display",
            "phone", "address", "city", "state", "pincode",
            "last_donation_date", "is_eligible", "is_complete",
            "next_eligible_date", "days_until_eligible",
            "is_available", "medical_notes",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class DonorProfileCreateSerializer(serializers.ModelSerializer):
    """Used when a donor registers their profile for the first time."""

    class Meta:
        model = DonorProfile
        fields = (
            "blood_group", "date_of_birth", "gender",
            "phone", "address", "city", "state", "pincode",
            "medical_notes",
        )

    def validate_date_of_birth(self, value):
        from datetime import date
        today = date.today()
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        if age < 18:
            raise serializers.ValidationError("Donor must be at least 18 years old.")
        if age > 65:
            raise serializers.ValidationError("Donor must be 65 years old or younger.")
        return value

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class DonorProfileSetupSerializer(serializers.ModelSerializer):
    """
    Used when a donor completes their profile for the first time (or via PATCH /donors/me/
    when is_complete=False).  Accepts all core fields including blood_group, date_of_birth,
    and gender, which cannot be changed via the normal edit flow once set.
    """

    class Meta:
        model = DonorProfile
        fields = (
            "blood_group", "date_of_birth", "gender",
            "phone", "address", "city", "state", "pincode",
            "medical_notes",
        )

    def validate_date_of_birth(self, value):
        from datetime import date
        if value is None:
            return value
        today = date.today()
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        if age < 18:
            raise serializers.ValidationError("Donor must be at least 18 years old.")
        if age > 65:
            raise serializers.ValidationError("Donor must be 65 years old or younger.")
        return value

    def validate(self, attrs):
        # When completing an incomplete profile, ensure all three core fields are present
        instance = self.instance
        blood_group = attrs.get("blood_group", getattr(instance, "blood_group", ""))
        date_of_birth = attrs.get("date_of_birth", getattr(instance, "date_of_birth", None))
        gender = attrs.get("gender", getattr(instance, "gender", ""))

        if not blood_group:
            raise serializers.ValidationError({"blood_group": "Blood group is required."})
        if not date_of_birth:
            raise serializers.ValidationError({"date_of_birth": "Date of birth is required."})
        if not gender:
            raise serializers.ValidationError({"gender": "Gender is required."})
        return attrs


class DonorProfileUpdateSerializer(serializers.ModelSerializer):
    """Partial update — donor can edit their own contact/availability details."""

    class Meta:
        model = DonorProfile
        fields = (
            "phone", "address", "city", "state", "pincode",
            "is_available", "medical_notes",
        )


class DonorListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views — avoids deep nesting."""
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.CharField(source="user.email", read_only=True)
    is_eligible = serializers.ReadOnlyField()

    class Meta:
        model = DonorProfile
        fields = (
            "id", "full_name", "email",
            "blood_group", "city", "phone",
            "last_donation_date", "is_eligible", "is_available",
        )
