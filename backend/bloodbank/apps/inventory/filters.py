from datetime import date, timedelta

import django_filters

from bloodbank.apps.donors.models import BloodGroup
from .models import BloodUnit, ComponentType, UnitStatus


class BloodUnitFilter(django_filters.FilterSet):
    blood_group = django_filters.ChoiceFilter(choices=BloodGroup.choices)
    component_type = django_filters.ChoiceFilter(choices=ComponentType.choices)
    status = django_filters.ChoiceFilter(choices=UnitStatus.choices)
    storage_location = django_filters.CharFilter(lookup_expr="icontains")
    expiry_before = django_filters.DateFilter(field_name="expiry_date", lookup_expr="lte")
    expiry_after = django_filters.DateFilter(field_name="expiry_date", lookup_expr="gte")
    expiring_soon = django_filters.BooleanFilter(method="filter_expiring_soon")
    collected_after = django_filters.DateFilter(field_name="collected_date", lookup_expr="gte")

    class Meta:
        model = BloodUnit
        fields = [
            "blood_group", "component_type", "status",
            "storage_location", "expiry_before", "expiry_after",
        ]

    def filter_expiring_soon(self, queryset, name, value):
        """?expiring_soon=true returns units expiring within 7 days."""
        if value:
            cutoff = date.today() + timedelta(days=7)
            return queryset.filter(
                expiry_date__lte=cutoff,
                expiry_date__gte=date.today(),
                status=UnitStatus.AVAILABLE,
            )
        return queryset
