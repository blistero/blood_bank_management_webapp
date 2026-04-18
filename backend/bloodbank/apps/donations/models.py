from django.conf import settings
from django.db import models

from bloodbank.apps.donors.models import DonorProfile
from bloodbank.apps.inventory.models import BloodUnit, ComponentType


class DonationStatus(models.TextChoices):
    SCHEDULED = "SCHEDULED", "Scheduled"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"
    REJECTED = "REJECTED", "Rejected (medically unfit)"


class Donation(models.Model):
    """
    Represents a single donation event.
    On completion a BloodUnit is created and the donor's
    last_donation_date is updated automatically via save().
    """
    donor = models.ForeignKey(
        DonorProfile,
        on_delete=models.PROTECT,
        related_name="donations",
    )
    scheduled_date = models.DateField()
    donation_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=10, choices=DonationStatus.choices, default=DonationStatus.SCHEDULED
    )
    component_type = models.CharField(
        max_length=3, choices=ComponentType.choices, default=ComponentType.WHOLE_BLOOD
    )
    volume_ml = models.PositiveIntegerField(default=450)
    # Snapshot blood group at donation time (donor may update profile later)
    blood_group = models.CharField(max_length=3, blank=True)
    blood_unit = models.OneToOneField(
        BloodUnit,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="donation",
    )
    rejection_reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="recorded_donations",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-scheduled_date"]
        verbose_name = "Donation"
        verbose_name_plural = "Donations"
        indexes = [
            models.Index(fields=["donor", "status"]),
            models.Index(fields=["scheduled_date"]),
        ]

    def __str__(self):
        return f"Donation #{self.pk} | {self.donor} | {self.status}"

    def save(self, *args, **kwargs):
        # Snapshot blood group from donor profile on first save
        if not self.blood_group and self.donor_id:
            self.blood_group = self.donor.blood_group
        super().save(*args, **kwargs)

    def complete(self, donation_date, storage_location="", recorded_by=None):
        """
        Mark donation as completed:
        1. Create a BloodUnit from this donation.
        2. Update donor's last_donation_date.
        3. Set status to COMPLETED.
        """
        from django.utils import timezone
        import uuid

        batch_number = f"BU-{donation_date.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        unit = BloodUnit.objects.create(
            batch_number=batch_number,
            blood_group=self.blood_group,
            component_type=self.component_type,
            volume_ml=self.volume_ml,
            collected_date=donation_date,
            storage_location=storage_location,
            donor=self.donor,
            recorded_by=recorded_by,
        )

        self.blood_unit = unit
        self.donation_date = donation_date
        self.status = DonationStatus.COMPLETED
        self.save()

        # Keep donor's last_donation_date in sync
        self.donor.last_donation_date = donation_date
        self.donor.save(update_fields=["last_donation_date", "updated_at"])

        return unit
