from django.urls import path

from .views import (
    DashboardView,
    DonationByBloodGroupView,
    DonationByStatusView,
    DonationTrendView,
    DonorsByBloodGroupView,
    DonorsByCityView,
    ExpiringUnitsView,
    InventoryByBloodGroupView,
    RequestsByBloodGroupView,
    RequestsByStatusView,
    RequestTrendView,
)

urlpatterns = [
    # Dashboard
    path("dashboard/", DashboardView.as_view(), name="report-dashboard"),

    # Donation reports
    path("donations/by-status/", DonationByStatusView.as_view(), name="report-donation-by-status"),
    path("donations/by-blood-group/", DonationByBloodGroupView.as_view(), name="report-donation-by-blood-group"),
    path("donations/trend/", DonationTrendView.as_view(), name="report-donation-trend"),

    # Inventory reports
    path("inventory/by-blood-group/", InventoryByBloodGroupView.as_view(), name="report-inventory-by-blood-group"),
    path("inventory/expiring/", ExpiringUnitsView.as_view(), name="report-inventory-expiring"),

    # Donor reports
    path("donors/by-blood-group/", DonorsByBloodGroupView.as_view(), name="report-donors-by-blood-group"),
    path("donors/by-city/", DonorsByCityView.as_view(), name="report-donors-by-city"),

    # Request reports
    path("requests/by-status/", RequestsByStatusView.as_view(), name="report-requests-by-status"),
    path("requests/by-blood-group/", RequestsByBloodGroupView.as_view(), name="report-requests-by-blood-group"),
    path("requests/trend/", RequestTrendView.as_view(), name="report-requests-trend"),
]
