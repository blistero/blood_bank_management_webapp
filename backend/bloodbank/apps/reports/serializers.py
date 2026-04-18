from rest_framework import serializers


# ── Dashboard ──────────────────────────────────────────────────────────────

class DashboardSerializer(serializers.Serializer):
    total_donors = serializers.IntegerField()
    eligible_donors = serializers.IntegerField()
    total_blood_units = serializers.IntegerField()
    available_units = serializers.IntegerField()
    expiring_soon_units = serializers.IntegerField()
    pending_requests = serializers.IntegerField()
    critical_requests = serializers.IntegerField()
    total_donations_this_month = serializers.IntegerField()
    fulfilled_requests_this_month = serializers.IntegerField()


# ── Donation Reports ───────────────────────────────────────────────────────

class DonationByStatusSerializer(serializers.Serializer):
    status = serializers.CharField()
    count = serializers.IntegerField()


class DonationByBloodGroupSerializer(serializers.Serializer):
    blood_group = serializers.CharField()
    count = serializers.IntegerField()
    total_volume_ml = serializers.IntegerField()


class DonationTrendSerializer(serializers.Serializer):
    month = serializers.CharField()
    count = serializers.IntegerField()
    total_volume_ml = serializers.IntegerField()


# ── Inventory Reports ──────────────────────────────────────────────────────

class InventoryByBloodGroupSerializer(serializers.Serializer):
    blood_group = serializers.CharField()
    component_type = serializers.CharField()
    available = serializers.IntegerField()
    reserved = serializers.IntegerField()
    expired = serializers.IntegerField()
    total_volume_ml = serializers.IntegerField()


class ExpiringUnitsSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    batch_number = serializers.CharField()
    blood_group = serializers.CharField()
    component_type = serializers.CharField()
    expiry_date = serializers.DateField()
    days_to_expiry = serializers.IntegerField()
    storage_location = serializers.CharField()


# ── Donor Reports ──────────────────────────────────────────────────────────

class DonorsByBloodGroupSerializer(serializers.Serializer):
    blood_group = serializers.CharField()
    total = serializers.IntegerField()
    eligible = serializers.IntegerField()
    unavailable = serializers.IntegerField()


class DonorsByCitySerializer(serializers.Serializer):
    city = serializers.CharField()
    total = serializers.IntegerField()
    eligible = serializers.IntegerField()


# ── Request Reports ────────────────────────────────────────────────────────

class RequestsByStatusSerializer(serializers.Serializer):
    status = serializers.CharField()
    count = serializers.IntegerField()


class RequestsByBloodGroupSerializer(serializers.Serializer):
    blood_group = serializers.CharField()
    total = serializers.IntegerField()
    fulfilled = serializers.IntegerField()
    pending = serializers.IntegerField()
    rejected = serializers.IntegerField()


class RequestTrendSerializer(serializers.Serializer):
    month = serializers.CharField()
    total = serializers.IntegerField()
    fulfilled = serializers.IntegerField()
