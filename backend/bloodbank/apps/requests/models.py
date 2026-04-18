from django.conf import settings
from django.db import models

from bloodbank.apps.donors.models import BloodGroup
from bloodbank.apps.inventory.models import BloodUnit, ComponentType, UnitStatus


class UrgencyLevel(models.TextChoices):
    ROUTINE = "ROUTINE", "Routine"
    URGENT = "URGENT", "Urgent (within 24 hours)"
    CRITICAL = "CRITICAL", "Critical (immediate)"


class RequestStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    APPROVED = "APPROVED", "Approved"
    FULFILLED = "FULFILLED", "Fulfilled"
    PARTIALLY_FULFILLED = "PARTIALLY_FULFILLED", "Partially Fulfilled"
    REJECTED = "REJECTED", "Rejected"
    CANCELLED = "CANCELLED", "Cancelled"


class BloodRequest(models.Model):
    """
    A hospital submits a blood request.
    Admin/Staff review → approve → fulfil by assigning BloodUnits.
    """
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="blood_requests",
        help_text="Hospital user who raised this request.",
    )
    patient_name = models.CharField(max_length=200)
    blood_group = models.CharField(max_length=3, choices=BloodGroup.choices)
    component_type = models.CharField(
        max_length=3, choices=ComponentType.choices, default=ComponentType.WHOLE_BLOOD
    )
    units_required = models.PositiveIntegerField()
    units_fulfilled = models.PositiveIntegerField(default=0)
    urgency = models.CharField(
        max_length=10, choices=UrgencyLevel.choices, default=UrgencyLevel.ROUTINE
    )
    required_by_date = models.DateField()
    status = models.CharField(
        max_length=20, choices=RequestStatus.choices, default=RequestStatus.PENDING
    )
    # Units assigned to fulfil this request
    assigned_units = models.ManyToManyField(
        BloodUnit,
        blank=True,
        related_name="fulfils_request",
    )
    rejection_reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="reviewed_requests",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Blood Request"
        verbose_name_plural = "Blood Requests"
        indexes = [
            models.Index(fields=["status", "urgency"]),
            models.Index(fields=["blood_group", "status"]),
            models.Index(fields=["required_by_date"]),
        ]

    def __str__(self):
        return (
            f"Request #{self.pk} | {self.blood_group} x{self.units_required} "
            f"| {self.urgency} | {self.status}"
        )

    @property
    def units_remaining(self):
        return max(self.units_required - self.units_fulfilled, 0)

    @property
    def is_overdue(self):
        from datetime import date
        return (
            date.today() > self.required_by_date
            and self.status not in (RequestStatus.FULFILLED, RequestStatus.CANCELLED, RequestStatus.REJECTED)
        )

    def approve(self, reviewed_by):
        self.status = RequestStatus.APPROVED
        self.reviewed_by = reviewed_by
        self.save(update_fields=["status", "reviewed_by", "updated_at"])

    def reject(self, reviewed_by, reason):
        self.status = RequestStatus.REJECTED
        self.reviewed_by = reviewed_by
        self.rejection_reason = reason
        self.save(update_fields=["status", "reviewed_by", "rejection_reason", "updated_at"])

    def fulfil(self, units: list, reviewed_by):
        """
        Assign BloodUnit instances to this request.
        Marks each unit USED, updates fulfilled count, sets final status.
        """
        if self.status not in (RequestStatus.APPROVED, RequestStatus.PARTIALLY_FULFILLED):
            raise ValueError("Only APPROVED or PARTIALLY_FULFILLED requests can be fulfilled.")

        for unit in units:
            if unit.status != UnitStatus.AVAILABLE:
                raise ValueError(f"Unit {unit.batch_number} is not available (status: {unit.status}).")
            unit.status = UnitStatus.USED
            unit.save(update_fields=["status", "updated_at"])
            self.assigned_units.add(unit)

        self.units_fulfilled += len(units)
        self.reviewed_by = reviewed_by

        if self.units_fulfilled >= self.units_required:
            self.status = RequestStatus.FULFILLED
        else:
            self.status = RequestStatus.PARTIALLY_FULFILLED

        self.save(update_fields=["units_fulfilled", "status", "reviewed_by", "updated_at"])
