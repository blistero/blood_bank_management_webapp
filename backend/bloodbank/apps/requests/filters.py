from datetime import date

import django_filters

from bloodbank.apps.donors.models import BloodGroup
from bloodbank.apps.inventory.models import ComponentType
from .models import BloodRequest, RequestStatus, UrgencyLevel


class BloodRequestFilter(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(choices=RequestStatus.choices)
    blood_group = django_filters.ChoiceFilter(choices=BloodGroup.choices)
    component_type = django_filters.ChoiceFilter(choices=ComponentType.choices)
    urgency = django_filters.ChoiceFilter(choices=UrgencyLevel.choices)
    required_before = django_filters.DateFilter(field_name="required_by_date", lookup_expr="lte")
    required_after = django_filters.DateFilter(field_name="required_by_date", lookup_expr="gte")
    created_after = django_filters.DateFilter(field_name="created_at__date", lookup_expr="gte")
    overdue = django_filters.BooleanFilter(method="filter_overdue")

    class Meta:
        model = BloodRequest
        fields = ["status", "blood_group", "component_type", "urgency"]

    def filter_overdue(self, queryset, name, value):
        """?overdue=true returns active requests past their required_by_date."""
        active = [RequestStatus.PENDING, RequestStatus.APPROVED, RequestStatus.PARTIALLY_FULFILLED]
        if value:
            return queryset.filter(required_by_date__lt=date.today(), status__in=active)
        return queryset
