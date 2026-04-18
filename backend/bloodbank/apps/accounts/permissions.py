from rest_framework.permissions import BasePermission

from .models import Role


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == Role.ADMIN)


class IsAdminOrStaff(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (Role.ADMIN, Role.STAFF)
        )


class IsHospital(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == Role.HOSPITAL)


class IsAdminOrStaffOrHospital(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (Role.ADMIN, Role.STAFF, Role.HOSPITAL)
        )


class IsDonor(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == Role.DONOR)


class IsOwnerOrAdmin(BasePermission):
    """Object-level: allow access if the user owns the object or is an admin."""

    def has_object_permission(self, request, view, obj):
        return obj == request.user or request.user.role == Role.ADMIN
