from datetime import date, timedelta

from django.conf import settings
from django.db import models


class BloodGroup(models.TextChoices):
    A_POS = "A+", "A+"
    A_NEG = "A-", "A-"
    B_POS = "B+", "B+"
    B_NEG = "B-", "B-"
    AB_POS = "AB+", "AB+"
    AB_NEG = "AB-", "AB-"
    O_POS = "O+", "O+"
    O_NEG = "O-", "O-"


class Gender(models.TextChoices):
    MALE = "M", "Male"
    FEMALE = "F", "Female"
    OTHER = "O", "Other"


# Minimum days between whole-blood donations (WHO guideline)
DONATION_INTERVAL_DAYS = 56


class DonorProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="donor_profile",
    )
    blood_group = models.CharField(max_length=3, choices=BloodGroup.choices, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=1, choices=Gender.choices, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=10, blank=True)
    last_donation_date = models.DateField(null=True, blank=True)
    is_available = models.BooleanField(default=True)
    medical_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Donor Profile"
        verbose_name_plural = "Donor Profiles"

    def __str__(self):
        return f"{self.user.full_name} ({self.blood_group or 'no blood group'})"

    @property
    def is_complete(self):
        """True once the donor has filled in blood_group, date_of_birth, and gender."""
        return bool(self.blood_group and self.date_of_birth and self.gender)

    @property
    def age(self):
        if not self.date_of_birth:
            return None
        today = date.today()
        dob = self.date_of_birth
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

    @property
    def is_eligible(self):
        """Donor is eligible if they have never donated or last donated > 56 days ago."""
        if not self.is_complete:
            return False
        if not self.is_available:
            return False
        if self.last_donation_date is None:
            return True
        return (date.today() - self.last_donation_date).days >= DONATION_INTERVAL_DAYS

    @property
    def next_eligible_date(self):
        """Returns the date the donor becomes eligible again, or today if already eligible."""
        if self.last_donation_date is None:
            return date.today()
        eligible_from = self.last_donation_date + timedelta(days=DONATION_INTERVAL_DAYS)
        return max(eligible_from, date.today())

    @property
    def days_until_eligible(self):
        if self.is_eligible:
            return 0
        return (self.next_eligible_date - date.today()).days
