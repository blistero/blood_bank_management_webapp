from django.conf import settings
from django.db import models


class CampStatus(models.TextChoices):
    UPCOMING  = "UPCOMING",   "Upcoming"
    LIVE      = "LIVE",       "Live"
    COMPLETED = "COMPLETED",  "Completed"
    CANCELLED = "CANCELLED",  "Cancelled"


class DonationCamp(models.Model):
    title         = models.CharField(max_length=200)
    organizer     = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="organized_camps",
    )
    hospital_name = models.CharField(max_length=200)
    address       = models.TextField()
    city          = models.CharField(max_length=100, db_index=True)
    state         = models.CharField(max_length=100)
    latitude      = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude     = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    start_date    = models.DateField()
    end_date      = models.DateField()
    start_time    = models.TimeField()
    end_time      = models.TimeField()
    contact_phone = models.CharField(max_length=20)
    description   = models.TextField(blank=True)
    status        = models.CharField(
        max_length=10, choices=CampStatus.choices, default=CampStatus.UPCOMING
    )
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["start_date", "start_time"]
        indexes = [
            models.Index(fields=["status", "start_date"]),
            models.Index(fields=["city", "status"]),
        ]

    def __str__(self):
        return f"{self.title} — {self.city} ({self.start_date})"

    def auto_update_status(self):
        """Compute status from dates; does NOT save — caller must save."""
        from datetime import date, datetime, time as time_type
        today = date.today()
        now   = datetime.now().time()

        if self.status == CampStatus.CANCELLED:
            return

        if today < self.start_date:
            self.status = CampStatus.UPCOMING
        elif today > self.end_date:
            self.status = CampStatus.COMPLETED
        elif self.start_date <= today <= self.end_date:
            if today == self.start_date and now < self.start_time:
                self.status = CampStatus.UPCOMING
            elif today == self.end_date and now > self.end_time:
                self.status = CampStatus.COMPLETED
            else:
                self.status = CampStatus.LIVE
