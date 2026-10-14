from django.contrib.postgres.search import TrigramSimilarity
from django.db.models import Q
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from apps.accounts.models import Profil
from apps.accounts.serializers import ProfilSerializer
from apps.videos.models import Video
from apps.videos.serializers import VideoListeSerializer


class RechercheGlobaleView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        if len(q) < 2:
            return Response({"profils": [], "videos": []})

        profils = (Profil.objects
                   .annotate(sim=TrigramSimilarity("nom_affiche", q))
                   .filter(Q(sim__gt=0.2) | Q(nom_affiche__icontains=q))
                   .order_by("-sim")[:10])

        videos = (Video.objects
                  .filter(statut="publie")
                  .filter(Q(titre__icontains=q) | Q(description__icontains=q))
                  .order_by("-publie_le")[:10])

        return Response({
            "profils": ProfilSerializer(profils, many=True, context={"request": request}).data,
            "videos": VideoListeSerializer(videos, many=True).data,
        })