from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminStaffOrHospital(BasePermission):
    """Can create/manage camps."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ("ADMIN", "STAFF", "HOSPITAL")
        )


class IsOrganizerOrAdminStaff(BasePermission):
    """Object-level: can edit/delete only own camp; admin/staff can edit any."""
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if request.user.role in ("ADMIN", "STAFF"):
            return True
        return obj.organizer_id == request.user.pk
