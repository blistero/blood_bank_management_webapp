from django.contrib import admin

from .models import BloodUnit


@admin.register(BloodUnit)
class BloodUnitAdmin(admin.ModelAdmin):
    list_display = (
        "batch_number", "blood_group", "component_type",
        "volume_ml", "status", "expiry_date",
        "days_to_expiry_display", "is_critical_display", "storage_location",
    )
    list_filter = ("blood_group", "component_type", "status")
    search_fields = ("batch_number", "storage_location", "donor__user__email")
    readonly_fields = (
        "created_at", "updated_at", "is_expired",
        "days_to_expiry", "is_critical", "recorded_by",
    )
    ordering = ("expiry_date",)
    date_hierarchy = "collected_date"

    fieldsets = (
        ("Unit Info", {
            "fields": ("batch_number", "blood_group", "component_type", "volume_ml"),
        }),
        ("Dates", {
            "fields": ("collected_date", "expiry_date", "is_expired", "days_to_expiry"),
        }),
        ("Status & Location", {
            "fields": ("status", "storage_location", "notes"),
        }),
        ("Links", {
            "fields": ("donor", "recorded_by"),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
        }),
    )

    @admin.display(description="Days to Expiry")
    def days_to_expiry_display(self, obj):
        return obj.days_to_expiry

    @admin.display(boolean=True, description="Critical?")
    def is_critical_display(self, obj):
        return obj.is_critical
