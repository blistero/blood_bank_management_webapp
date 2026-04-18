from django.contrib import admin

from .models import BloodRequest


@admin.register(BloodRequest)
class BloodRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id", "patient_name", "blood_group", "component_type",
        "units_required", "units_fulfilled", "urgency",
        "required_by_date", "status", "is_overdue_display",
    )
    list_filter = ("status", "urgency", "blood_group", "component_type")
    search_fields = (
        "patient_name",
        "requested_by__email", "requested_by__first_name",
    )
    readonly_fields = (
        "units_fulfilled", "reviewed_by", "is_overdue",
        "units_remaining", "created_at", "updated_at",
    )
    filter_horizontal = ("assigned_units",)
    ordering = ("-created_at",)
    date_hierarchy = "created_at"

    fieldsets = (
        ("Request Info", {
            "fields": (
                "requested_by", "patient_name",
                "blood_group", "component_type",
                "units_required", "units_fulfilled", "units_remaining",
                "urgency", "required_by_date", "is_overdue",
            ),
        }),
        ("Status & Review", {
            "fields": ("status", "reviewed_by", "rejection_reason", "notes"),
        }),
        ("Assigned Units", {"fields": ("assigned_units",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            "requested_by", "reviewed_by"
        ).prefetch_related("assigned_units")

    @admin.display(boolean=True, description="Overdue?")
    def is_overdue_display(self, obj):
        return obj.is_overdue
