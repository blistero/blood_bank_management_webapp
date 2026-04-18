"""
Tests for DonorProfile auto-creation and setup flow.
"""
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from bloodbank.apps.donors.models import DonorProfile

User = get_user_model()

REGISTER_URL = "/api/v1/accounts/register/"
ME_URL = "/api/v1/donors/me/"
CREATE_URL = "/api/v1/donors/create/"


def _auth_header(user):
    token = RefreshToken.for_user(user).access_token
    return {"HTTP_AUTHORIZATION": f"Bearer {token}"}


def _dob(age=25):
    """Return a date-of-birth string for someone of the given age."""
    return (date.today() - timedelta(days=age * 365)).strftime("%Y-%m-%d")


class DonorRegistrationAutoCreateTest(APITestCase):
    """Registration creates a blank DonorProfile for DONOR accounts."""

    def test_donor_registration_creates_profile(self):
        payload = {
            "email": "newdonor@test.com",
            "first_name": "Test",
            "last_name": "Donor",
            "phone": "9876543210",
            "role": "DONOR",
            "password": "StrongPass123!",
            "password2": "StrongPass123!",
        }
        res = self.client.post(REGISTER_URL, payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)

        user = User.objects.get(email="newdonor@test.com")
        self.assertTrue(
            DonorProfile.objects.filter(user=user).exists(),
            "DonorProfile should be auto-created on DONOR registration",
        )
        profile = DonorProfile.objects.get(user=user)
        self.assertFalse(profile.is_complete, "Newly registered profile should be incomplete")
        self.assertEqual(profile.phone, "9876543210", "Phone should be copied from User")

    def test_hospital_registration_does_not_create_profile(self):
        payload = {
            "email": "hospital@test.com",
            "first_name": "City",
            "last_name": "Hospital",
            "phone": "0404040404",
            "role": "HOSPITAL",
            "password": "StrongPass123!",
            "password2": "StrongPass123!",
        }
        res = self.client.post(REGISTER_URL, payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)

        user = User.objects.get(email="hospital@test.com")
        self.assertFalse(
            DonorProfile.objects.filter(user=user).exists(),
            "DonorProfile should NOT be created for HOSPITAL accounts",
        )


class MyDonorProfileViewTest(APITestCase):
    """GET and PATCH /api/v1/donors/me/ behaviour for complete, incomplete, and missing profiles."""

    def setUp(self):
        self.donor = User.objects.create_user(
            email="donor@test.com",
            first_name="Jane",
            last_name="Doe",
            phone="9000000001",
            role="DONOR",
            password="pass",
        )

    def _get_me(self):
        return self.client.get(ME_URL, **_auth_header(self.donor))

    def _patch_me(self, data):
        return self.client.patch(ME_URL, data, format="json", **_auth_header(self.donor))

    # ── GET ──────────────────────────────────────────────────────────────────

    def test_get_me_returns_profile_even_when_incomplete(self):
        """After registration the donor always gets a profile back (never 404)."""
        DonorProfile.objects.create(user=self.donor, phone="9000000001")
        res = self._get_me()
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertFalse(res.data["is_complete"])

    def test_get_me_auto_creates_profile_for_legacy_account(self):
        """Legacy accounts (no profile) should get a blank profile on first GET."""
        self.assertFalse(DonorProfile.objects.filter(user=self.donor).exists())
        res = self._get_me()
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertTrue(DonorProfile.objects.filter(user=self.donor).exists())
        self.assertFalse(res.data["is_complete"])

    # ── PATCH setup ───────────────────────────────────────────────────────────

    def test_patch_me_completes_incomplete_profile(self):
        DonorProfile.objects.create(user=self.donor, phone="9000000001")
        payload = {
            "blood_group": "O+",
            "date_of_birth": _dob(28),
            "gender": "F",
            "phone": "9000000001",
            "city": "Hyderabad",
        }
        res = self._patch_me(payload)
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        profile = DonorProfile.objects.get(user=self.donor)
        self.assertTrue(profile.is_complete)
        self.assertEqual(profile.blood_group, "O+")
        self.assertEqual(profile.city, "Hyderabad")

    def test_patch_me_setup_rejects_under_18(self):
        DonorProfile.objects.create(user=self.donor)
        payload = {
            "blood_group": "A+",
            "date_of_birth": _dob(15),
            "gender": "M",
            "phone": "9000000001",
            "city": "Hyderabad",
        }
        res = self._patch_me(payload)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("date_of_birth", res.data)

    def test_patch_me_setup_requires_blood_group(self):
        DonorProfile.objects.create(user=self.donor)
        payload = {
            "date_of_birth": _dob(25),
            "gender": "F",
            "phone": "9000000001",
            "city": "Hyderabad",
        }
        res = self._patch_me(payload)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("blood_group", res.data)

    # ── PATCH update (complete profile) ───────────────────────────────────────

    def test_patch_me_update_complete_profile(self):
        DonorProfile.objects.create(
            user=self.donor,
            blood_group="B+",
            date_of_birth=_dob(30),
            gender="M",
            phone="9000000001",
            city="Warangal",
        )
        res = self._patch_me({"city": "Hyderabad", "phone": "9111111111"})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(DonorProfile.objects.get(user=self.donor).city, "Hyderabad")

    # ── is_complete property ──────────────────────────────────────────────────

    def test_is_complete_false_when_fields_missing(self):
        profile = DonorProfile.objects.create(user=self.donor)
        self.assertFalse(profile.is_complete)

    def test_is_complete_true_when_all_core_fields_set(self):
        profile = DonorProfile.objects.create(
            user=self.donor,
            blood_group="AB+",
            date_of_birth=_dob(22),
            gender="O",
        )
        self.assertTrue(profile.is_complete)

    def test_age_returns_none_when_dob_missing(self):
        profile = DonorProfile.objects.create(user=self.donor)
        self.assertIsNone(profile.age)

    def test_is_eligible_false_when_incomplete(self):
        profile = DonorProfile.objects.create(user=self.donor)
        self.assertFalse(profile.is_eligible)
