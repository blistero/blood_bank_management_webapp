import django_filters

from .models import DonorProfile, BloodGroup


class DonorFilter(django_filters.FilterSet):
    blood_group = django_filters.ChoiceFilter(choices=BloodGroup.choices)
    city = django_filters.CharFilter(lookup_expr="icontains")
    state = django_filters.CharFilter(lookup_expr="icontains")
    is_available = django_filters.BooleanFilter()
    min_age = django_filters.NumberFilter(field_name="date_of_birth", lookup_expr="lte",
                                          method="filter_min_age", label="Minimum age")
    max_age = django_filters.NumberFilter(field_name="date_of_birth", lookup_expr="gte",
                                          method="filter_max_age", label="Maximum age")

    class Meta:
        model = DonorProfile
        fields = ["blood_group", "city", "state", "is_available"]

    def filter_min_age(self, queryset, name, value):
        from datetime import date
        from dateutil.relativedelta import relativedelta
        cutoff = date.today() - relativedelta(years=int(value))
        return queryset.filter(date_of_birth__lte=cutoff)

    def filter_max_age(self, queryset, name, value):
        from datetime import date
        from dateutil.relativedelta import relativedelta
        cutoff = date.today() - relativedelta(years=int(value))
        return queryset.filter(date_of_birth__gte=cutoff)
