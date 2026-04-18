from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .permissions import IsAdmin, IsOwnerOrAdmin
from .serializers import (
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    RegisterSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
)


class CustomTokenObtainPairView(TokenObtainPairView):
    """Login — returns access, refresh, role, full_name, email."""
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    """Public registration endpoint. Anyone can create a DONOR or HOSPITAL account."""
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "message": "Account created successfully.",
                "user": UserProfileSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ProfileView(generics.RetrieveUpdateAPIView):
    """Authenticated user's own profile — read or partial update."""
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return UserProfileUpdateSerializer
        return UserProfileSerializer

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """Authenticated user changes their own password."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Password updated successfully."}, status=status.HTTP_200_OK)


class UserListView(generics.ListAPIView):
    """Admin-only: list all users with optional role filter."""
    serializer_class = UserProfileSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ["role", "is_active"]
    search_fields = ["email", "first_name", "last_name"]

    def get_queryset(self):
        return User.objects.all()


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin: retrieve, update, or deactivate any user."""
    serializer_class = UserProfileSerializer
    permission_classes = [IsOwnerOrAdmin]

    def get_queryset(self):
        return User.objects.all()

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        user.is_active = False
        user.save()
        return Response({"message": "User deactivated."}, status=status.HTTP_200_OK)
