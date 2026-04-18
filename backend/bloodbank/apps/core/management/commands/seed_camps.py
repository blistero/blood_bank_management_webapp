"""
Management command: seed_camps
Seeds 15 realistic donation camps across Hyderabad, Secunderabad, Warangal,
Karimnagar, Vijayawada, and Nizamabad.

Usage:
  python manage.py seed_camps             # insert only (skip duplicates)
  python manage.py seed_camps --flush     # delete ALL camps, then re-seed
"""

from datetime import date, time, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from bloodbank.apps.camps.models import DonationCamp, CampStatus

User = get_user_model()

TODAY = date.today()

# fmt: off
# Columns:
#   title, hospital_name, address, city, state,
#   lat, lng,
#   days_from_today (start), duration_days,
#   start_time, end_time,
#   contact_phone
CAMPS_DATA = [
    # ── Hyderabad (5) ─────────────────────────────────────────────────────
    (
        "World Blood Donor Day Camp 2026",
        "Apollo Hospitals",
        "Jubilee Hills, Road No. 72",
        "Hyderabad", "Telangana",
        17.4318, 78.4072,
        -8, 1,
        time(9, 0), time(17, 0),
        "+91 98490 11001",
    ),
    (
        "City Blood Drive — Somajiguda",
        "Yashoda Hospitals",
        "Raj Bhavan Road, Somajiguda",
        "Hyderabad", "Telangana",
        17.4228, 78.4575,
        0, 1,
        time(8, 30), time(17, 30),
        "+91 98490 22002",
    ),
    (
        "HITEC City Corporate Blood Camp",
        "Care Hospitals",
        "HITEC City, Madhapur",
        "Hyderabad", "Telangana",
        17.4477, 78.3777,
        4, 1,
        time(9, 0), time(18, 0),
        "+91 98490 33003",
    ),
    (
        "Hyderabad University Blood Mela",
        "Kamineni Hospitals",
        "Osmania University Road, Amberpet",
        "Hyderabad", "Telangana",
        17.4123, 78.5148,
        9, 2,
        time(8, 0), time(16, 0),
        "+91 98490 44004",
    ),
    (
        "Aware Hospital Awareness Blood Camp",
        "Aware Global Hospital",
        "King Koti Road, Abids",
        "Hyderabad", "Telangana",
        17.3850, 78.4867,
        -14, 1,
        time(10, 0), time(17, 0),
        "+91 98490 55005",
    ),

    # ── Secunderabad (2) ──────────────────────────────────────────────────
    (
        "Secunderabad Garrison Blood Drive",
        "Yashoda Hospital Secunderabad",
        "SP Road, Secunderabad",
        "Secunderabad", "Telangana",
        17.4401, 78.4981,
        -3, 1,
        time(9, 0), time(17, 0),
        "+91 98491 11011",
    ),
    (
        "SD Road Community Blood Camp",
        "Apollo Spectra Hospital",
        "SD Road, Secunderabad",
        "Secunderabad", "Telangana",
        17.4419, 78.5028,
        6, 1,
        time(8, 0), time(16, 30),
        "+91 98491 22022",
    ),

    # ── Warangal (2) ──────────────────────────────────────────────────────
    (
        "Kakatiya Blood Donation Mela",
        "MGM Hospital Warangal",
        "Kazipet Road, Hanamkonda",
        "Warangal", "Telangana",
        17.9784, 79.5941,
        -5, 2,
        time(9, 0), time(17, 0),
        "+91 98492 11021",
    ),
    (
        "Warangal Youth Blood Drive",
        "Kakatiya Medical College",
        "Lashkar Bazar, Warangal",
        "Warangal", "Telangana",
        17.9689, 79.5942,
        11, 1,
        time(8, 30), time(16, 30),
        "+91 98492 22032",
    ),

    # ── Karimnagar (2) ────────────────────────────────────────────────────
    (
        "Karimnagar District Blood Camp",
        "Suraksha Hospital",
        "Manakondur Road, Karimnagar",
        "Karimnagar", "Telangana",
        18.4386, 79.1288,
        0, 1,
        time(9, 0), time(17, 30),
        "+91 98493 11031",
    ),
    (
        "NIT Karimnagar Blood Donation Drive",
        "Government General Hospital Karimnagar",
        "Jagtial Road, Karimnagar",
        "Karimnagar", "Telangana",
        18.4336, 79.1305,
        14, 1,
        time(8, 0), time(17, 0),
        "+91 98493 22042",
    ),

    # ── Vijayawada (2) ────────────────────────────────────────────────────
    (
        "Vijayawada Mega Blood Drive",
        "Ramesh Hospitals",
        "Governorpet, Vijayawada",
        "Vijayawada", "Andhra Pradesh",
        16.5062, 80.6480,
        -6, 1,
        time(9, 0), time(17, 0),
        "+91 98494 11041",
    ),
    (
        "Krishna River Blood Mela",
        "Andhra Hospital",
        "MG Road, Vijayawada",
        "Vijayawada", "Andhra Pradesh",
        16.5193, 80.6305,
        7, 2,
        time(8, 30), time(18, 0),
        "+91 98494 22052",
    ),

    # ── Nizamabad (2) ─────────────────────────────────────────────────────
    (
        "Nizamabad District Blood Donation Camp",
        "Srinivasa Hospital",
        "Bus Stand Road, Nizamabad",
        "Nizamabad", "Telangana",
        18.6725, 78.0941,
        -2, 1,
        time(9, 30), time(17, 0),
        "+91 98495 11051",
    ),
    (
        "Nizamabad Lions Club Blood Drive",
        "Government District Hospital Nizamabad",
        "Armoor Road, Nizamabad",
        "Nizamabad", "Telangana",
        18.6754, 78.0988,
        16, 1,
        time(8, 0), time(16, 0),
        "+91 98495 22062",
    ),
]
# fmt: on

DESCRIPTIONS = {
    "COMPLETED": (
        "This blood donation camp has successfully concluded. "
        "We thank all donors for their generous contribution. "
        "Every unit donated can save up to three lives."
    ),
    "LIVE": (
        "The camp is live today — walk in now and donate blood. "
        "Free health check-up, refreshments, and certificate provided to all donors. "
        "No prior appointment required."
    ),
    "UPCOMING": (
        "Join us for a blood donation drive. "
        "Free health check-up, refreshments, and certificate provided to all donors. "
        "No prior appointment required. Bring a valid photo ID."
    ),
}


class Command(BaseCommand):
    help = "Seed 15 blood donation camps across Hyderabad, Secunderabad, Warangal, Karimnagar, Vijayawada, Nizamabad"

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete ALL existing camps before re-seeding",
        )

    def handle(self, *args, **options):
        if options["flush"]:
            deleted, _ = DonationCamp.objects.all().delete()
            self.stdout.write(f"Flushed {deleted} existing camp(s).")

        admin = User.objects.filter(role="ADMIN").first()
        hospitals = list(User.objects.filter(role="HOSPITAL"))

        if not admin:
            self.stdout.write(self.style.ERROR("No admin user found. Run seed_data first."))
            return

        # Build round-robin organizer list: prefer hospitals, fall back to admin
        def next_organizer(index: int):
            if hospitals:
                # give ~60 % of camps to hospital users, rest to admin
                return hospitals[index % len(hospitals)] if index % 5 != 0 else admin
            return admin

        created = skipped = 0

        with transaction.atomic():
            for idx, (
                title, hospital_name, address, city, state,
                lat, lng,
                days_start, duration,
                start_time, end_time,
                contact_phone,
            ) in enumerate(CAMPS_DATA):

                if DonationCamp.objects.filter(title=title).exists():
                    skipped += 1
                    continue

                start_date = TODAY + timedelta(days=days_start)
                end_date   = start_date + timedelta(days=duration - 1)

                camp = DonationCamp(
                    title=title,
                    organizer=next_organizer(idx),
                    hospital_name=hospital_name,
                    address=address,
                    city=city,
                    state=state,
                    latitude=round(lat + (idx % 3 - 1) * 0.001, 6),   # tiny deterministic offset
                    longitude=round(lng + (idx % 3 - 1) * 0.001, 6),
                    start_date=start_date,
                    end_date=end_date,
                    start_time=start_time,
                    end_time=end_time,
                    contact_phone=contact_phone,
                )

                camp.auto_update_status()
                camp.description = DESCRIPTIONS.get(camp.status, DESCRIPTIONS["UPCOMING"]).replace(
                    "a blood donation drive",
                    f"a blood donation drive organised by {hospital_name}",
                )

                camp.save()
                created += 1

        # Summary breakdown
        counts = {}
        for status in (CampStatus.UPCOMING, CampStatus.LIVE, CampStatus.COMPLETED, CampStatus.CANCELLED):
            n = DonationCamp.objects.filter(status=status).count()
            if n:
                counts[status] = n

        breakdown = "  |  ".join(f"{s}: {n}" for s, n in counts.items())
        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Created {created}, skipped {skipped} duplicate(s). "
                f"Total camps: {DonationCamp.objects.count()}  [{breakdown}]"
            )
        )
