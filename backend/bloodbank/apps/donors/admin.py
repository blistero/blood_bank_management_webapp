from django.contrib import admin

from .models import DonorProfile


@admin.register(DonorProfile)
class DonorProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user", "blood_group", "gender", "city",
        "last_donation_date", "is_eligible_display", "is_available",
    )
    list_filter = ("blood_group", "gender", "city", "is_available")
    search_fields = ("user__email", "user__first_name", "user__last_name", "city")
    readonly_fields = (
        "created_at", "updated_at", "is_eligible_display",
        "next_eligible_date", "days_until_eligible", "age",
    )
    ordering = ("-created_at",)

    fieldsets = (
        ("User", {"fields": ("user",)}),
        ("Medical Info", {"fields": ("blood_group", "date_of_birth", "age", "gender", "medical_notes")}),
        ("Contact", {"fields": ("phone", "address", "city", "state", "pincode")}),
        ("Donation Status", {
            "fields": (
                "last_donation_date", "is_eligible_display",
                "next_eligible_date", "days_until_eligible", "is_available",
            ),
        }),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )

    @admin.display(boolean=True, description="Eligible to donate?")
    def is_eligible_display(self, obj):
        return obj.is_eligible
