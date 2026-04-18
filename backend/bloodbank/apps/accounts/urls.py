from django.urls import path

from .views import (
    ChangePasswordView,
    CustomTokenObtainPairView,
    ProfileView,
    RegisterView,
    UserDetailView,
    UserListView,
)

urlpatterns = [
    path("login/", CustomTokenObtainPairView.as_view(), name="accounts-login"),
    path("register/", RegisterView.as_view(), name="accounts-register"),
    path("profile/", ProfileView.as_view(), name="accounts-profile"),
    path("change-password/", ChangePasswordView.as_view(), name="accounts-change-password"),
    path("users/", UserListView.as_view(), name="accounts-user-list"),
    path("users/<int:pk>/", UserDetailView.as_view(), name="accounts-user-detail"),
]
