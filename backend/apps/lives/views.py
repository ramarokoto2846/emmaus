from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from apps.common.pagination import StandardPagination
from .models import Direct, DirectMessage, DirectRappel, StatutDirect
from .serializers import DirectMessageSerializer, DirectSerializer


class DirectViewSet(viewsets.ModelViewSet):
    queryset = Direct.objects.select_related("hote__profil", "eglise")
    serializer_class = DirectSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = StandardPagination
    filterset_fields = ["statut", "hote", "eglise"]
    ordering_fields = ["debut_prevu", "pic_spectateurs"]

    def perform_create(self, serializer):
        serializer.save(hote=self.request.user)

    @action(detail=False, methods=["get"])
    def live(self, request):
        qs = self.get_queryset().filter(statut=StatutDirect.EN_COURS)
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticatedOrReadOnly])
    def demarrer(self, request, pk=None):
        d = self.get_object()
        d.statut = StatutDirect.EN_COURS
        d.debut_reel = timezone.now()
        d.save(update_fields=["statut", "debut_reel"])
        return Response(DirectSerializer(d).data)

    @action(detail=True, methods=["post"])
    def terminer(self, request, pk=None):
        d = self.get_object()
        d.statut = StatutDirect.TERMINE
        d.fin_reelle = timezone.now()
        d.save(update_fields=["statut", "fin_reelle"])
        return Response(DirectSerializer(d).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticatedOrReadOnly])
    def rappel(self, request, pk=None):
        d = self.get_object()
        DirectRappel.objects.get_or_create(direct=d, utilisateur=request.user)
        return Response({"rappel": True})

    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        d = self.get_object()
        if request.method == "POST":
            s = DirectMessageSerializer(data=request.data)
            s.is_valid(raise_exception=True)
            s.save(direct=d, auteur=request.user)
            return Response(s.data, status=201)
        qs = d.messages.select_related("auteur__profil").order_by("-cree_le")[:100]
        return Response(DirectMessageSerializer(qs, many=True).data)