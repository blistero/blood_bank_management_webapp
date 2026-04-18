import django_filters

from bloodbank.apps.donors.models import BloodGroup
from bloodbank.apps.inventory.models import ComponentType
from .models import Donation, DonationStatus


class DonationFilter(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(choices=DonationStatus.choices)
    blood_group = django_filters.ChoiceFilter(choices=BloodGroup.choices)
    component_type = django_filters.ChoiceFilter(choices=ComponentType.choices)
    scheduled_after = django_filters.DateFilter(field_name="scheduled_date", lookup_expr="gte")
    scheduled_before = django_filters.DateFilter(field_name="scheduled_date", lookup_expr="lte")
    donated_after = django_filters.DateFilter(field_name="donation_date", lookup_expr="gte")
    donated_before = django_filters.DateFilter(field_name="donation_date", lookup_expr="lte")
    donor_city = django_filters.CharFilter(
        field_name="donor__city", lookup_expr="icontains"
    )

    class Meta:
        model = Donation
        fields = [
            "status", "blood_group", "component_type",
            "scheduled_after", "scheduled_before",
            "donated_after", "donated_before",
        ]
