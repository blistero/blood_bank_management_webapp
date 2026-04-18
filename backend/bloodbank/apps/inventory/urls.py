from django.urls import path

from .views import (
    BloodAvailabilityView,
    BloodUnitCreateView,
    BloodUnitDetailView,
    BloodUnitListView,
    MarkExpiredView,
    StockSummaryView,
)

urlpatterns = [
    path("", BloodUnitListView.as_view(), name="inventory-list"),
    path("add/", BloodUnitCreateView.as_view(), name="inventory-add"),
    path("summary/", StockSummaryView.as_view(), name="inventory-summary"),
    path("mark-expired/", MarkExpiredView.as_view(), name="inventory-mark-expired"),
    path("<int:pk>/", BloodUnitDetailView.as_view(), name="inventory-detail"),
    path("available/<str:blood_group>/", BloodAvailabilityView.as_view(), name="inventory-available"),
]
