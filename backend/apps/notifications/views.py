from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.pagination import StandardPagination
from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    filterset_fields = ["lu", "type"]

    def get_queryset(self):
        return Notification.objects.filter(
            destinataire=self.request.user
        ).select_related("acteur__profil")

    @action(detail=True, methods=["post"])
    def lire(self, request, pk=None):
        n = self.get_object()
        n.lu = True
        n.save(update_fields=["lu"])
        return Response({"lu": True})

    @action(detail=False, methods=["post"])
    def tout_lire(self, request):
        Notification.objects.filter(
            destinataire=request.user, lu=False
        ).update(lu=True)
        return Response({"ok": True})

    @action(detail=False, methods=["get"])
    def compter(self, request):
        n = Notification.objects.filter(
            destinataire=request.user, lu=False
        ).count()
        return Response({"non_lues": n})

    @action(detail=False, methods=["post"])
    def tout_supprimer(self, request):
        """Supprime toutes les notifications de l'utilisateur."""
        nb, _ = Notification.objects.filter(
            destinataire=request.user
        ).delete()
        return Response({"ok": True, "supprimees": nb})
