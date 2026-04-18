from django.urls import path

from .views import (
    BloodRequestCreateView,
    BloodRequestDetailView,
    BloodRequestListView,
    RequestApproveView,
    RequestCancelView,
    RequestFulfilView,
    RequestRejectView,
)

urlpatterns = [
    path("", BloodRequestListView.as_view(), name="request-list"),
    path("create/", BloodRequestCreateView.as_view(), name="request-create"),
    path("<int:pk>/", BloodRequestDetailView.as_view(), name="request-detail"),
    path("<int:pk>/approve/", RequestApproveView.as_view(), name="request-approve"),
    path("<int:pk>/reject/", RequestRejectView.as_view(), name="request-reject"),
    path("<int:pk>/fulfil/", RequestFulfilView.as_view(), name="request-fulfil"),
    path("<int:pk>/cancel/", RequestCancelView.as_view(), name="request-cancel"),
]
