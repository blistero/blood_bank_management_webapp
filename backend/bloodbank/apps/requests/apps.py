from django.apps import AppConfig


class BloodRequestsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "bloodbank.apps.requests"
    label = "blood_requests"  # avoids collision with Python's built-in requests module
