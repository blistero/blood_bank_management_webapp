from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView

from bloodbank.apps.accounts.views import CustomTokenObtainPairView

API_V1 = "api/v1/"

urlpatterns = [
    path("admin/", admin.site.urls),

    # JWT auth — custom login injects role + full_name into response
    path(f"{API_V1}auth/login/", CustomTokenObtainPairView.as_view(), name="token_obtain"),
    path(f"{API_V1}auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path(f"{API_V1}auth/logout/", TokenBlacklistView.as_view(), name="token_blacklist"),

    # App routers
    path(f"{API_V1}accounts/", include("bloodbank.apps.accounts.urls")),
    path(f"{API_V1}donors/", include("bloodbank.apps.donors.urls")),
    path(f"{API_V1}inventory/", include("bloodbank.apps.inventory.urls")),
    path(f"{API_V1}donations/", include("bloodbank.apps.donations.urls")),
    path(f"{API_V1}requests/", include("bloodbank.apps.requests.urls")),
    path(f"{API_V1}reports/", include("bloodbank.apps.reports.urls")),
    path(f"{API_V1}camps/",   include("bloodbank.apps.camps.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
