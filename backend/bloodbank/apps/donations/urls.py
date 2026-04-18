from django.urls import path

from .views import (
    DonationCancelView,
    DonationCompleteView,
    DonationDetailView,
    DonationListView,
    DonationRejectView,
    DonationScheduleView,
    MyDonationHistoryView,
)

urlpatterns = [
    path("", DonationListView.as_view(), name="donation-list"),
    path("schedule/", DonationScheduleView.as_view(), name="donation-schedule"),
    path("my-history/", MyDonationHistoryView.as_view(), name="donation-my-history"),
    path("<int:pk>/", DonationDetailView.as_view(), name="donation-detail"),
    path("<int:pk>/complete/", DonationCompleteView.as_view(), name="donation-complete"),
    path("<int:pk>/cancel/", DonationCancelView.as_view(), name="donation-cancel"),
    path("<int:pk>/reject/", DonationRejectView.as_view(), name="donation-reject"),
]
