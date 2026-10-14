from django.db.models import F
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from apps.common.pagination import StandardPagination
from .models import DefiLecture, DefiParticipation, Priant, SujetPriere
from .serializers import (DefiLectureSerializer, DefiParticipationSerializer,
                          SujetPriereSerializer)


class SujetPriereViewSet(viewsets.ModelViewSet):
    queryset = SujetPriere.objects.select_related("auteur__profil")
    serializer_class = SujetPriereSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = None
    filterset_fields = ["visibilite", "exauce", "auteur"]

    def perform_create(self, serializer):
        serializer.save(auteur=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def prier(self, request, pk=None):
        sujet = self.get_object()
        obj, created = Priant.objects.get_or_create(sujet=sujet, utilisateur=request.user)
        if not created:
            obj.delete()
            SujetPriere.objects.filter(pk=sujet.pk).update(nb_priants=F("nb_priants") - 1)
            return Response({"priant": False})
        SujetPriere.objects.filter(pk=sujet.pk).update(nb_priants=F("nb_priants") + 1)
        return Response({"priant": True})


class DefiLectureViewSet(viewsets.ModelViewSet):
    queryset = DefiLecture.objects.select_related("createur")
    serializer_class = DefiLectureSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = None

    def perform_create(self, serializer):
        serializer.save(createur=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def rejoindre(self, request, pk=None):
        defi = self.get_object()
        obj, created = DefiParticipation.objects.get_or_create(
            defi=defi, utilisateur=request.user
        )
        if created:
            DefiLecture.objects.filter(pk=defi.pk).update(
                nb_participants=F("nb_participants") + 1
            )
        return Response(DefiParticipationSerializer(obj).data, status=201 if created else 200)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def progression(self, request, pk=None):
        defi = self.get_object()
        p = DefiParticipation.objects.get(defi=defi, utilisateur=request.user)
        p.chapitre_actuel = int(request.data.get("chapitre_actuel", p.chapitre_actuel))
        p.pourcentage = min(100, round(p.chapitre_actuel / defi.nb_chapitres * 100, 2))
        p.save()
        return Response(DefiParticipationSerializer(p).data)