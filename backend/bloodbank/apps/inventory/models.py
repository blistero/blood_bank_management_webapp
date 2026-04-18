from datetime import date, timedelta

from django.conf import settings
from django.db import models

from bloodbank.apps.donors.models import BloodGroup


class ComponentType(models.TextChoices):
    WHOLE_BLOOD = "WB", "Whole Blood"
    RED_CELLS = "RBC", "Red Blood Cells"
    PLATELETS = "PLT", "Platelets"
    PLASMA = "PLS", "Fresh Frozen Plasma"


# WHO shelf-life in days per component
SHELF_LIFE_DAYS = {
    ComponentType.WHOLE_BLOOD: 35,
    ComponentType.RED_CELLS: 42,
    ComponentType.PLATELETS: 5,
    ComponentType.PLASMA: 365,
}


class UnitStatus(models.TextChoices):
    AVAILABLE = "AVAILABLE", "Available"
    RESERVED = "RESERVED", "Reserved"
    USED = "USED", "Used"
    EXPIRED = "EXPIRED", "Expired"
    DISCARDED = "DISCARDED", "Discarded"


class BloodUnit(models.Model):
    """
    Represents a single physical unit (bag) of blood or blood component.
    Each unit is individually tracked through its lifecycle.
    """
    batch_number = models.CharField(max_length=50, unique=True)
    blood_group = models.CharField(max_length=3, choices=BloodGroup.choices)
    component_type = models.CharField(
        max_length=3, choices=ComponentType.choices, default=ComponentType.WHOLE_BLOOD
    )
    volume_ml = models.PositiveIntegerField(default=450, help_text="Volume in millilitres")
    collected_date = models.DateField()
    expiry_date = models.DateField()
    status = models.CharField(
        max_length=10, choices=UnitStatus.choices, default=UnitStatus.AVAILABLE
    )
    storage_location = models.CharField(max_length=100, blank=True)
    donor = models.ForeignKey(
        "donors.DonorProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="donated_units",
    )
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="recorded_units",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["expiry_date"]
        verbose_name = "Blood Unit"
        verbose_name_plural = "Blood Units"
        indexes = [
            models.Index(fields=["blood_group", "status"]),
            models.Index(fields=["expiry_date"]),
        ]

    def __str__(self):
        return f"{self.batch_number} | {self.blood_group} {self.component_type} | {self.status}"

    def save(self, *args, **kwargs):
        if not self.expiry_date and self.collected_date and self.component_type:
            days = SHELF_LIFE_DAYS.get(self.component_type, 35)
            self.expiry_date = self.collected_date + timedelta(days=days)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return date.today() > self.expiry_date

    @property
    def days_to_expiry(self):
        delta = (self.expiry_date - date.today()).days
        return max(delta, 0)

    @property
    def is_critical(self):
        """Flags units expiring within 3 days."""
        return 0 < self.days_to_expiry <= 3
