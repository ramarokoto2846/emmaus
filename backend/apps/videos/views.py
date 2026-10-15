from django.db.models import F
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
    IsAuthenticatedOrReadOnly,
)
from rest_framework.response import Response

from apps.common.pagination import StandardPagination
from apps.common.permissions import EstAuteurOuLectureSeule
from .models import (
    Serie,
    StatutVideo,
    Theme,
    Verset,
    Video,
    VueVideo,
    VersetDuJour,
)
from .serializers import (
    SerieSerializer,
    ThemeSerializer,
    VersetSerializer,
    VideoDetailSerializer,
    VideoEcritureSerializer,
    VideoListeSerializer,
)


class ThemeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Theme.objects.order_by("nom")
    serializer_class = ThemeSerializer
    pagination_class = None
    filterset_fields = ["tendance"]
    search_fields = ["nom"]


class VersetViewSet(viewsets.ModelViewSet):
    """Verset : lecture publique, écriture réservée admin/modérateur."""
    queryset = Verset.objects.order_by("livre", "chapitre", "verset_debut")
    serializer_class = VersetSerializer
    pagination_class = None
    filterset_fields = ["livre", "chapitre", "traduction", "actif_sidebar"]
    search_fields = ["texte", "livre"]

    def _est_admin(self, request):
        return (
            request.user.is_authenticated
            and (
                request.user.role in ("admin", "moderateur")
                or request.user.is_superuser
            )
        )

    def create(self, request, *args, **kwargs):
        if not self._est_admin(request):
            return Response({"detail": "Non autorisé."}, status=403)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not self._est_admin(request):
            return Response({"detail": "Non autorisé."}, status=403)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if not self._est_admin(request):
            return Response({"detail": "Non autorisé."}, status=403)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not self._est_admin(request):
            return Response({"detail": "Non autorisé."}, status=403)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def toggle_sidebar(self, request, pk=None):
        """Ajoute/retire ce verset de la sidebar (admin/modérateur seulement)."""
        if not self._est_admin(request):
            return Response({"detail": "Non autorisé."}, status=403)
        v = self.get_object()
        v.actif_sidebar = not v.actif_sidebar
        v.save(update_fields=["actif_sidebar"])
        return Response({"actif_sidebar": v.actif_sidebar})


class VersetsSidebarView(viewsets.ViewSet):
    """Renvoie les versets pour la sidebar (rotation côté client)."""
    permission_classes = [AllowAny]

    def list(self, request):
        qs = Verset.objects.filter(actif_sidebar=True).order_by("id")
        if not qs.exists():
            qs = Verset.objects.order_by("id")
        return Response(VersetSerializer(qs, many=True).data)


class SerieViewSet(viewsets.ModelViewSet):
    queryset = Serie.objects.select_related("auteur")
    serializer_class = SerieSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(auteur=self.request.user)


class VideoViewSet(viewsets.ModelViewSet):
    queryset = (
        Video.objects
        .select_related("auteur__profil", "eglise", "serie")
        .prefetch_related("themes_lies__theme", "versets_lies__verset")
    )
    permission_classes = [IsAuthenticatedOrReadOnly, EstAuteurOuLectureSeule]
    pagination_class = StandardPagination
    filterset_fields = ["type", "format", "statut", "visibilite", "auteur", "eglise"]
    search_fields = ["titre", "description"]
    ordering_fields = ["publie_le", "nb_vues", "nb_amen", "cree_le"]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return VideoEcritureSerializer
        if self.action == "retrieve":
            return VideoDetailSerializer
        return VideoListeSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.is_authenticated and self.action != "retrieve":
            return (
                qs.filter(statut=StatutVideo.PUBLIE)
                | qs.filter(auteur=self.request.user)
            )
        return qs.filter(statut=StatutVideo.PUBLIE)

    def perform_create(self, serializer):
        serializer.save(auteur=self.request.user)

    def perform_update(self, serializer):
        """
        ✅ Si la vidéo était vérifiée par la modération,
        on retire le badge quand l'auteur la modifie.
        Elle devra être réexaminée.
        """
        video = self.get_object()
        etait_verifiee = video.moderation_verifiee

        instance = serializer.save()

        if etait_verifiee:
            instance.moderation_verifiee = False
            instance.save(update_fields=["moderation_verifiee"])

    @action(detail=True, methods=["post"])
    def publier(self, request, pk=None):
        video = self.get_object()
        video.statut = StatutVideo.PUBLIE
        video.publie_le = timezone.now()
        video.save(update_fields=["statut", "publie_le"])
        from apps.accounts.models import Profil
        Profil.objects.filter(utilisateur=request.user).update(
            nb_videos=F("nb_videos") + 1
        )
        return Response({"statut": video.statut, "publie_le": video.publie_le})

    @action(detail=True, methods=["post"], permission_classes=[AllowAny])
    def vue(self, request, pk=None):
        """Enregistre une vue unique par utilisateur."""
        video = self.get_object()

        utilisateur = request.user if request.user.is_authenticated else None

        if utilisateur:
            vue, created = VueVideo.objects.get_or_create(
                video=video,
                utilisateur=utilisateur,
                defaults={
                    "duree_regardee_secondes": int(
                        request.data.get("duree_regardee_secondes", 0)
                    ),
                    "position_reprise_secondes": int(
                        request.data.get("position_reprise_secondes", 0)
                    ),
                    "termine": bool(request.data.get("termine", False)),
                },
            )

            if not created:
                vue.duree_regardee_secondes = int(
                    request.data.get("duree_regardee_secondes", vue.duree_regardee_secondes)
                )
                vue.position_reprise_secondes = int(
                    request.data.get("position_reprise_secondes", vue.position_reprise_secondes)
                )
                if request.data.get("termine"):
                    vue.termine = True
                vue.save()

            if created:
                Video.objects.filter(pk=video.pk).update(nb_vues=F("nb_vues") + 1)

            return Response({
                "vue": True,
                "nouvelle": created,
                "nb_vues": Video.objects.get(pk=video.pk).nb_vues,
            })

        Video.objects.filter(pk=video.pk).update(nb_vues=F("nb_vues") + 1)
        return Response({
            "vue": True,
            "nouvelle": True,
            "nb_vues": Video.objects.get(pk=video.pk).nb_vues,
        })


class VersetDuJourView(viewsets.ViewSet):
    """Renvoie le verset du jour (ou le plus récent, ou fallback)."""
    permission_classes = [AllowAny]

    def list(self, request):
        today = timezone.now().date()

        vdj = (
            VersetDuJour.objects
            .select_related("verset")
            .filter(date=today)
            .first()
        )

        if not vdj:
            vdj = (
                VersetDuJour.objects
                .select_related("verset")
                .filter(date__lt=today)
                .order_by("-date")
                .first()
            )

        if not vdj:
            premier = Verset.objects.order_by("id").first()
            if premier:
                return Response({
                    "date": str(today),
                    "verset": VersetSerializer(premier).data,
                })
            return Response({"detail": "Aucun verset."}, status=404)

        return Response({
            "date": str(vdj.date),
            "verset": VersetSerializer(vdj.verset).data,
        })


# =========================================================================
# UPLOAD + COMPRESSION VIDÉO
# =========================================================================
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.files import File
import os


class UploadVideoView(viewsets.ViewSet):
    """
    POST /api/videos-upload/
    Upload d'une vidéo.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request):
        import traceback
        from django.utils import timezone

        fichier = request.FILES.get("fichier")
        if not fichier:
            return Response({"detail": "Aucun fichier fourni."}, status=400)

        if fichier.size > 500 * 1024 * 1024:
            return Response({"detail": "Fichier trop gros (max 500 Mo)."}, status=400)

        titre = request.data.get("titre", "").strip()
        if not titre:
            return Response({"detail": "Titre obligatoire."}, status=400)

        description = request.data.get("description", "")
        type_video = request.data.get("type", "predication")
        visibilite = request.data.get("visibilite", "public")

        # ✅ Nouvelle vidéo : jamais vérifiée d'office
        video = Video.objects.create(
            auteur=request.user,
            titre=titre,
            description=description,
            type=type_video,
            visibilite=visibilite,
            statut=StatutVideo.PUBLIE,
            publie_le=timezone.now(),
            taille_originale_octets=fichier.size,
            taille_compressee_octets=fichier.size,
            moderation_verifiee=False,
        )

        try:
            video.fichier.save(fichier.name, File(fichier), save=True)

            try:
                from .services import generer_miniature, obtenir_duree
                chemin = video.fichier.path
                duree = obtenir_duree(chemin)
                if duree:
                    video.duree_secondes = duree

                chemin_mini = generer_miniature(chemin, seconde=1)
                if chemin_mini:
                    with open(chemin_mini, "rb") as f:
                        video.miniature.save(f"min_{video.id}.jpg", File(f), save=False)
                    os.remove(chemin_mini)
            except Exception as e:
                print(f"⚠️ Durée/miniature non générées : {e}")

            video.save()

            from apps.accounts.models import Profil
            Profil.objects.filter(utilisateur=request.user).update(
                nb_videos=F("nb_videos") + 1
            )

            from apps.feed.models import Publication
            Publication.objects.create(
                auteur=request.user,
                texte=description or f"🎬 {titre}",
                video=video,
                type="video",
                visibilite=visibilite,
            )

            return Response(
                {
                    "id": str(video.id),
                    "titre": video.titre,
                    "statut": video.statut,
                    "duree_secondes": video.duree_secondes,
                    "taille_originale": video.taille_originale_octets,
                    "fichier_url": request.build_absolute_uri(video.fichier.url)
                    if video.fichier
                    else None,
                    "miniature_url": request.build_absolute_uri(video.miniature.url)
                    if video.miniature
                    else None,
                },
                status=201,
            )

        except Exception as e:
            traceback.print_exc()
            video.statut = StatutVideo.BROUILLON
            video.save(update_fields=["statut"])
            return Response(
                {"detail": f"Erreur : {str(e)}"},
                status=500,
            )