from django.urls import path
from .views import (
    CampListView,
    CampNearbyView,
    CampCreateView,
    CampDetailView,
    LiveCampsView,
)

urlpatterns = [
    path("",           CampListView.as_view(),   name="camp-list"),
    path("nearby/",    CampNearbyView.as_view(),  name="camp-nearby"),
    path("create/",    CampCreateView.as_view(),  name="camp-create"),
    path("live/",      LiveCampsView.as_view(),   name="camp-live"),
    path("<int:pk>/",  CampDetailView.as_view(),  name="camp-detail"),
]
