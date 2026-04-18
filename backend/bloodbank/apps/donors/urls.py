from django.urls import path

from .views import (
    DonorCreateView,
    DonorDetailView,
    DonorListView,
    EligibleDonorsByBloodGroupView,
    MyDonorProfileView,
    UpdateLastDonationView,
)

urlpatterns = [
    path("", DonorListView.as_view(), name="donor-list"),
    path("create/", DonorCreateView.as_view(), name="donor-create"),
    path("me/", MyDonorProfileView.as_view(), name="donor-me"),
    path("<int:pk>/", DonorDetailView.as_view(), name="donor-detail"),
    path("<int:pk>/update-donation/", UpdateLastDonationView.as_view(), name="donor-update-donation"),
    path("eligible/<str:blood_group>/", EligibleDonorsByBloodGroupView.as_view(), name="donor-eligible-by-blood-group"),
]
