from django.contrib import admin

from .models import Donation, DonationStatus


@admin.register(Donation)
class DonationAdmin(admin.ModelAdmin):
    list_display = (
        "id", "donor", "blood_group", "component_type",
        "scheduled_date", "donation_date", "status", "volume_ml",
    )
    list_filter = ("status", "blood_group", "component_type")
    search_fields = (
        "donor__user__email", "donor__user__first_name",
        "donor__user__last_name", "blood_group",
    )
    readonly_fields = ("blood_group", "blood_unit", "recorded_by", "created_at", "updated_at")
    ordering = ("-scheduled_date",)
    date_hierarchy = "scheduled_date"

    fieldsets = (
        ("Donor", {"fields": ("donor", "blood_group")}),
        ("Appointment", {
            "fields": ("scheduled_date", "donation_date", "status", "component_type", "volume_ml"),
        }),
        ("Outcome", {
            "fields": ("blood_unit", "rejection_reason", "notes"),
        }),
        ("Meta", {
            "fields": ("recorded_by", "created_at", "updated_at"),
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            "donor__user", "blood_unit", "recorded_by"
        )
