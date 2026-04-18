"""
Management command: seed_data
Populates the database with realistic Indian blood bank dummy data.
Safe to re-run — skips existing seed users by email prefix.
"""

import random
import uuid
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from bloodbank.apps.donors.models import DonorProfile, BloodGroup, Gender, DONATION_INTERVAL_DAYS
from bloodbank.apps.inventory.models import BloodUnit, ComponentType, UnitStatus, SHELF_LIFE_DAYS
from bloodbank.apps.donations.models import Donation, DonationStatus
from bloodbank.apps.requests.models import BloodRequest, UrgencyLevel, RequestStatus

User = get_user_model()

# ── Static data pools ──────────────────────────────────────────────────────

MALE_FIRST = [
    "Arjun", "Rahul", "Vikram", "Amit", "Suresh", "Rajesh", "Deepak",
    "Naveen", "Kiran", "Arun", "Rohit", "Manoj", "Sanjay", "Nitin",
    "Pradeep", "Ashok", "Vishal", "Sunil", "Anil", "Ravi",
]

FEMALE_FIRST = [
    "Priya", "Neha", "Divya", "Ananya", "Sunita", "Kavita", "Meera",
    "Pooja", "Rekha", "Geeta",
]

LAST_NAMES = [
    "Sharma", "Patel", "Singh", "Kumar", "Reddy", "Nair", "Joshi",
    "Mehta", "Iyer", "Gupta", "Tiwari", "Yadav", "Jain", "Mishra",
    "Chauhan", "Shinde", "Patil", "Bose", "Pillai", "Chandra",
    "Malhotra", "Rao", "Kapoor", "Verma", "Saxena",
]

CITIES_STATES = [
    ("Mumbai", "Maharashtra"),
    ("Pune", "Maharashtra"),
    ("Delhi", "Delhi"),
    ("Bengaluru", "Karnataka"),
    ("Chennai", "Tamil Nadu"),
    ("Hyderabad", "Telangana"),
    ("Kolkata", "West Bengal"),
    ("Ahmedabad", "Gujarat"),
    ("Jaipur", "Rajasthan"),
    ("Lucknow", "Uttar Pradesh"),
]

HOSPITALS = [
    ("Apollo Hospital", "apollo"),
    ("Fortis Healthcare", "fortis"),
    ("Max Hospital", "maxhospital"),
    ("Lilavati Hospital", "lilavati"),
    ("Manipal Hospital", "manipal"),
    ("Narayana Health", "narayana"),
    ("Kokilaben Hospital", "kokilaben"),
    ("Ruby Hall Clinic", "rubyhall"),
]

PATIENT_FIRST = [
    "Ramu", "Seema", "Hari", "Lata", "Babu", "Gita", "Ram", "Sita",
    "Mohan", "Usha", "Raj", "Anita", "Vijay", "Kamla", "Dinesh",
    "Sarla", "Bharat", "Pushpa", "Gopal", "Savita",
]

STORAGE_LOCATIONS = [
    "Fridge A – Shelf 1", "Fridge A – Shelf 2", "Fridge A – Shelf 3",
    "Fridge B – Shelf 1", "Fridge B – Shelf 2",
    "Freezer 1 – Shelf 1", "Freezer 1 – Shelf 2",
    "Platelet Agitator 1", "Platelet Agitator 2",
]

BLOOD_GROUPS = [g[0] for g in BloodGroup.choices]

# Weighted distribution — O+ and B+ are most common in India
BG_WEIGHTS = [20, 4, 28, 6, 8, 2, 28, 4]  # A+, A-, B+, B-, AB+, AB-, O+, O-

COMPONENT_TYPES = [ComponentType.WHOLE_BLOOD, ComponentType.RED_CELLS,
                   ComponentType.PLATELETS, ComponentType.PLASMA]
COMPONENT_WEIGHTS = [45, 30, 15, 10]

TODAY = date.today()


def days_ago(n):
    return TODAY - timedelta(days=n)


def rand_date_in_range(start_days_ago, end_days_ago=0):
    """Returns a random date between start_days_ago and end_days_ago from today."""
    lo = min(start_days_ago, end_days_ago)
    hi = max(start_days_ago, end_days_ago)
    return TODAY - timedelta(days=random.randint(lo, hi))


def rand_blood_group():
    return random.choices(BLOOD_GROUPS, weights=BG_WEIGHTS, k=1)[0]


def rand_component():
    return random.choices(COMPONENT_TYPES, weights=COMPONENT_WEIGHTS, k=1)[0]


def batch_number(collected: date, suffix: str = "") -> str:
    tag = suffix or uuid.uuid4().hex[:6].upper()
    return f"BU-{collected.strftime('%Y%m%d')}-{tag}"


class Command(BaseCommand):
    help = "Seed the database with realistic Indian blood bank dummy data"

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete all existing seed data before re-seeding",
        )

    def handle(self, *args, **options):
        if options["flush"]:
            self._flush()

        with transaction.atomic():
            admin = self._ensure_admin()
            staff = self._create_staff()
            hospitals = self._create_hospitals()
            donors = self._create_donors(30)
            self.stdout.write(f"  [OK] {len(donors)} donors")

            donations = self._create_donations(donors, admin, 25)
            self.stdout.write(f"  [OK] {len(donations)} donations")

            units = self._create_extra_units(donors, admin, target_total=80)
            self.stdout.write(f"  [OK] {BloodUnit.objects.count()} blood units total")

            requests = self._create_requests(hospitals, admin, 20)
            self.stdout.write(f"  [OK] {len(requests)} blood requests")

        self.stdout.write(self.style.SUCCESS(
            "\nSeed complete! Login with:\n"
            "  Admin  — admin@bloodbank.com / Admin@1234\n"
            "  Staff  — staff@bloodbank.com / Staff@1234\n"
            "  Donor  — donor01@seed.com   / Seed@1234\n"
            "  Hospital — apollo@seed.com  / Seed@1234\n"
        ))

    # ── Flush ──────────────────────────────────────────────────────────────

    def _flush(self):
        self.stdout.write("Flushing seed data…")
        BloodRequest.objects.filter(requested_by__email__endswith="@seed.com").delete()
        Donation.objects.filter(donor__user__email__endswith="@seed.com").delete()
        BloodUnit.objects.filter(batch_number__startswith="BU-").delete()
        DonorProfile.objects.filter(user__email__endswith="@seed.com").delete()
        User.objects.filter(email__endswith="@seed.com").delete()
        self.stdout.write("  [OK] Flushed")

    # ── Admin / Staff ──────────────────────────────────────────────────────

    def _ensure_admin(self):
        admin, _ = User.objects.get_or_create(
            email="admin@bloodbank.com",
            defaults=dict(
                first_name="Admin", last_name="User",
                role="ADMIN", is_staff=True, is_superuser=True,
            ),
        )
        if not admin.has_usable_password():
            admin.set_password("Admin@1234")
            admin.save()
        return admin

    def _create_staff(self):
        staff, created = User.objects.get_or_create(
            email="staff@bloodbank.com",
            defaults=dict(first_name="Staff", last_name="User", role="STAFF", is_staff=True),
        )
        if created:
            staff.set_password("Staff@1234")
            staff.save()
        return staff

    # ── Hospitals ──────────────────────────────────────────────────────────

    def _create_hospitals(self):
        users = []
        for name, slug in HOSPITALS:
            email = f"{slug}@seed.com"
            u, created = User.objects.get_or_create(
                email=email,
                defaults=dict(first_name=name, last_name="Admin", role="HOSPITAL"),
            )
            if created:
                u.set_password("Seed@1234")
                u.save()
            users.append(u)
        return users

    # ── Donors ─────────────────────────────────────────────────────────────

    def _create_donors(self, count: int):
        profiles = []
        used_emails = set(User.objects.filter(email__endswith="@seed.com").values_list("email", flat=True))

        # Build name pool
        names = []
        for fn in MALE_FIRST:
            for ln in random.sample(LAST_NAMES, 2):
                names.append((fn, ln, Gender.MALE))
        for fn in FEMALE_FIRST:
            for ln in random.sample(LAST_NAMES, 2):
                names.append((fn, ln, Gender.FEMALE))
        random.shuffle(names)

        created = 0
        for first, last, gender in names:
            if created >= count:
                break
            email = f"donor{created + 1:02d}@seed.com"
            if email in used_emails:
                continue

            age = random.randint(20, 55)
            dob = TODAY.replace(year=TODAY.year - age) - timedelta(days=random.randint(0, 364))
            city, state = random.choice(CITIES_STATES)
            blood_group = rand_blood_group()

            # ~70% have donated before; spread last donation across last 6 months
            last_donation = None
            if random.random() < 0.70:
                last_donation = rand_date_in_range(180, 10)

            u = User.objects.create_user(
                email=email,
                password="Seed@1234",
                first_name=first,
                last_name=last,
                role="DONOR",
            )
            p = DonorProfile.objects.create(
                user=u,
                blood_group=blood_group,
                date_of_birth=dob,
                gender=gender,
                phone=f"+91 9{random.randint(100000000, 999999999)}",
                address=f"{random.randint(1, 200)}, {random.choice(['MG Road', 'Gandhi Nagar', 'Nehru Street', 'Patel Colony', 'Shivaji Marg'])}",
                city=city,
                state=state,
                pincode=f"{random.randint(100000, 999999)}",
                last_donation_date=last_donation,
                is_available=random.random() > 0.10,
            )
            profiles.append(p)
            created += 1

        return profiles

    # ── Donations ──────────────────────────────────────────────────────────

    def _create_donations(self, donors: list, recorded_by, count: int):
        donations = []
        donor_pool = list(donors)
        random.shuffle(donor_pool)

        # Status distribution
        statuses = (
            [DonationStatus.COMPLETED] * 15
            + [DonationStatus.SCHEDULED] * 4
            + [DonationStatus.CANCELLED] * 3
            + [DonationStatus.REJECTED] * 3
        )
        random.shuffle(statuses)

        used_donors_completed = set()

        for i, status in enumerate(statuses[:count]):
            donor = donor_pool[i % len(donor_pool)]
            component = rand_component()

            if status == DonationStatus.COMPLETED:
                # Past date — spread across last 6 months
                sched = rand_date_in_range(180, 15)
                donation_date = sched + timedelta(days=random.randint(0, 2))

                # Avoid creating a BloodUnit with duplicate batch_number
                suffix = uuid.uuid4().hex[:6].upper()
                bn = batch_number(donation_date, suffix)

                unit = BloodUnit.objects.create(
                    batch_number=bn,
                    blood_group=donor.blood_group,
                    component_type=component,
                    volume_ml=random.choice([350, 400, 450]),
                    collected_date=donation_date,
                    storage_location=random.choice(STORAGE_LOCATIONS),
                    donor=donor,
                    recorded_by=recorded_by,
                )
                # Some completed units are already used/expired
                roll = random.random()
                if unit.is_expired:
                    unit.status = UnitStatus.EXPIRED
                elif roll < 0.25:
                    unit.status = UnitStatus.USED
                elif roll < 0.35:
                    unit.status = UnitStatus.RESERVED
                unit.save(update_fields=["status"])

                d = Donation.objects.create(
                    donor=donor,
                    scheduled_date=sched,
                    donation_date=donation_date,
                    status=DonationStatus.COMPLETED,
                    component_type=component,
                    volume_ml=unit.volume_ml,
                    blood_group=donor.blood_group,
                    blood_unit=unit,
                    recorded_by=recorded_by,
                )

                # Update donor's last_donation_date to latest completed donation
                if donor.last_donation_date is None or donation_date > donor.last_donation_date:
                    donor.last_donation_date = donation_date
                    donor.save(update_fields=["last_donation_date", "updated_at"])
                used_donors_completed.add(donor.id)

            elif status == DonationStatus.SCHEDULED:
                sched = TODAY + timedelta(days=random.randint(1, 21))
                d = Donation.objects.create(
                    donor=donor,
                    scheduled_date=sched,
                    status=DonationStatus.SCHEDULED,
                    component_type=component,
                    volume_ml=random.choice([350, 400, 450]),
                    blood_group=donor.blood_group,
                    recorded_by=recorded_by,
                )

            elif status == DonationStatus.CANCELLED:
                sched = rand_date_in_range(120, 5)
                d = Donation.objects.create(
                    donor=donor,
                    scheduled_date=sched,
                    status=DonationStatus.CANCELLED,
                    component_type=component,
                    volume_ml=450,
                    blood_group=donor.blood_group,
                    rejection_reason="Donor cancelled appointment",
                    recorded_by=recorded_by,
                )

            else:  # REJECTED
                sched = rand_date_in_range(120, 5)
                reasons = [
                    "Haemoglobin below threshold (< 12.5 g/dL)",
                    "Recent fever — deferred for 14 days",
                    "Blood pressure out of range",
                    "Medication disqualification",
                ]
                d = Donation.objects.create(
                    donor=donor,
                    scheduled_date=sched,
                    status=DonationStatus.REJECTED,
                    component_type=component,
                    volume_ml=450,
                    blood_group=donor.blood_group,
                    rejection_reason=random.choice(reasons),
                    recorded_by=recorded_by,
                )

            donations.append(d)

        return donations

    # ── Extra blood units ──────────────────────────────────────────────────

    def _create_extra_units(self, donors: list, recorded_by, target_total: int):
        existing = BloodUnit.objects.count()
        needed = max(0, target_total - existing)
        if needed == 0:
            return []

        # Status distribution for extra units
        status_pool = (
            [UnitStatus.AVAILABLE] * 55
            + [UnitStatus.RESERVED] * 10
            + [UnitStatus.USED] * 20
            + [UnitStatus.EXPIRED] * 10
            + [UnitStatus.DISCARDED] * 5
        )

        created_units = []
        attempts = 0
        while len(created_units) < needed and attempts < needed * 3:
            attempts += 1
            component = rand_component()
            blood_group = rand_blood_group()
            status = random.choice(status_pool)

            # Collected date based on component shelf life
            shelf = SHELF_LIFE_DAYS[component]

            if status == UnitStatus.EXPIRED:
                # Collected far enough back that it expired
                collected = rand_date_in_range(shelf + 30, shelf + 5)
            elif status == UnitStatus.USED:
                collected = rand_date_in_range(180, 20)
            elif status == UnitStatus.AVAILABLE:
                # Still within shelf life — vary freshness
                max_days_ago = shelf - 2
                collected = rand_date_in_range(max_days_ago, 1) if max_days_ago > 1 else days_ago(1)
            elif status == UnitStatus.RESERVED:
                max_days_ago = shelf - 3
                collected = rand_date_in_range(max_days_ago, 3) if max_days_ago > 3 else days_ago(3)
            else:  # DISCARDED
                collected = rand_date_in_range(200, 30)

            suffix = uuid.uuid4().hex[:6].upper()
            bn = batch_number(collected, suffix)

            # Expiry is auto-computed in BloodUnit.save(), but set explicitly for clarity
            expiry = collected + timedelta(days=shelf)

            donor = random.choice(donors) if random.random() < 0.6 else None

            try:
                unit = BloodUnit.objects.create(
                    batch_number=bn,
                    blood_group=blood_group,
                    component_type=component,
                    volume_ml=random.choice([350, 400, 450, 500]),
                    collected_date=collected,
                    expiry_date=expiry,
                    status=status,
                    storage_location=random.choice(STORAGE_LOCATIONS),
                    donor=donor,
                    recorded_by=recorded_by,
                )
                created_units.append(unit)
            except Exception:
                continue  # batch_number collision, retry

        return created_units

    # ── Blood requests ─────────────────────────────────────────────────────

    def _create_requests(self, hospitals: list, admin, count: int):
        requests = []

        # Status distribution
        status_pool = (
            [RequestStatus.PENDING] * 5
            + [RequestStatus.APPROVED] * 3
            + [RequestStatus.FULFILLED] * 7
            + [RequestStatus.PARTIALLY_FULFILLED] * 2
            + [RequestStatus.REJECTED] * 2
            + [RequestStatus.CANCELLED] * 1
        )
        random.shuffle(status_pool)

        urgency_pool = (
            [UrgencyLevel.ROUTINE] * 10
            + [UrgencyLevel.URGENT] * 6
            + [UrgencyLevel.CRITICAL] * 4
        )
        random.shuffle(urgency_pool)

        for i in range(count):
            hospital = random.choice(hospitals)
            status = status_pool[i % len(status_pool)]
            urgency = urgency_pool[i % len(urgency_pool)]
            blood_group = rand_blood_group()
            component = rand_component()
            units_required = random.randint(1, 4)

            # required_by_date
            if status in (RequestStatus.FULFILLED, RequestStatus.PARTIALLY_FULFILLED, RequestStatus.REJECTED, RequestStatus.CANCELLED):
                required_by = rand_date_in_range(150, 5)
            elif status == RequestStatus.PENDING:
                required_by = TODAY + timedelta(days=random.randint(-2, 10))
            else:  # APPROVED
                required_by = TODAY + timedelta(days=random.randint(1, 14))

            units_fulfilled = 0
            reviewed_by = None

            if status == RequestStatus.FULFILLED:
                units_fulfilled = units_required
                reviewed_by = admin
            elif status == RequestStatus.PARTIALLY_FULFILLED:
                units_fulfilled = max(1, units_required - 1)
                reviewed_by = admin
            elif status in (RequestStatus.APPROVED, RequestStatus.REJECTED):
                reviewed_by = admin

            patient_name = (
                f"{random.choice(PATIENT_FIRST)} "
                f"{random.choice(LAST_NAMES)}"
            )

            notes_pool = [
                "Post-operative transfusion required",
                "Trauma case — road accident",
                "Thalassemia patient — regular transfusion",
                "Surgical preparation",
                "Dengue with platelet drop",
                "Anaemia — chronic kidney disease",
                "Pre-operative reserve",
                "",
            ]

            rejection_reason = ""
            if status == RequestStatus.REJECTED:
                rejection_reason = random.choice([
                    "Insufficient justification provided",
                    "Requested blood group not available",
                    "Duplicate request — merged with existing",
                ])

            r = BloodRequest.objects.create(
                requested_by=hospital,
                patient_name=patient_name,
                blood_group=blood_group,
                component_type=component,
                units_required=units_required,
                units_fulfilled=units_fulfilled,
                urgency=urgency,
                required_by_date=required_by,
                status=status,
                rejection_reason=rejection_reason,
                notes=random.choice(notes_pool),
                reviewed_by=reviewed_by,
            )
            requests.append(r)

        return requests
