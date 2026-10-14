from django.db.models import F, Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from apps.accounts.models import Abonnement
from apps.common.pagination import FilPagination
from apps.common.permissions import EstAuteurOuLectureSeule
from apps.notifications.services import creer_notification
from .models import Amen, Commentaire, Enregistrement, Partage, Publication
from .serializers import (CommentaireSerializer, PartageSerializer,
                          PublicationEcritureSerializer, PublicationSerializer)


class FilView(viewsets.ReadOnlyModelViewSet):
    """Fil d'actualités : publications des profils suivis + publiques."""
    serializer_class = PublicationSerializer
    pagination_class = FilPagination

    def get_queryset(self):
        user = self.request.user
        base = (Publication.objects
                .select_related("auteur__profil", "video", "verset")
                .filter(visibilite="public"))
        if user.is_authenticated:
            suivis = Abonnement.objects.filter(
                suiveur=user
            ).values_list("suivi_id", flat=True)
            return base.filter(Q(auteur_id__in=suivis) | Q(auteur=user))
        return base

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class PublicationViewSet(viewsets.ModelViewSet):
    serializer_class = PublicationSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, EstAuteurOuLectureSeule]
    pagination_class = FilPagination
    filterset_fields = ["auteur", "type", "visibilite"]

    def get_queryset(self):
        from django.db.models import Q
        user = self.request.user
        base = (Publication.objects
                .select_related("auteur__profil", "video", "verset"))
        if not user.is_authenticated:
            return base.filter(visibilite="public")
        # On voit : les publications publiques + les siennes + celles des gens qu'on suit (si abonnes)
        suivis = user.abonnements.values_list("suivi_id", flat=True)
        return base.filter(
            Q(visibilite="public")
            | Q(auteur=user)
            | Q(visibilite="abonnes", auteur_id__in=suivis)
        )

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return PublicationEcritureSerializer
        return PublicationSerializer

    def perform_create(self, serializer):
        serializer.save(auteur=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def amen(self, request, pk=None):
        pub = self.get_object()
        obj, created = Amen.objects.get_or_create(
            utilisateur=request.user, cible_type="publication", cible_id=pub.id
        )
        if not created:
            obj.delete()
            Publication.objects.filter(pk=pub.pk).update(nb_amen=F("nb_amen") - 1)
            return Response({"amen": False})

        Publication.objects.filter(pk=pub.pk).update(nb_amen=F("nb_amen") + 1)

        creer_notification(
            destinataire=pub.auteur,
            acteur=request.user,
            type="amen",
            cible_type="publication",
            cible_id=pub.id,
        )

        return Response({"amen": True})



    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def repartager(self, request, pk=None):
        """Republie une publication sur son propre mur (self ou autre)."""
        publication = self.get_object()

        # Éviter les doublons
        deja_republie = Publication.objects.filter(
            auteur=request.user,
            publication_origine=publication,
            type="partage",
        ).exists()

        if deja_republie:
            return Response(
                {"detail": "Tu as déjà repartagé cette publication."},
                status=400,
            )

        # Créer la publication de repartage
        nouvelle = Publication.objects.create(
            auteur=request.user,
            texte=request.data.get("texte", ""),
            publication_origine=publication,
            type="partage",
            visibilite="public",
        )

        # Incrémenter le compteur de partages de l'original
        Publication.objects.filter(pk=publication.pk).update(
            nb_partages=F("nb_partages") + 1
        )

        # Notifier l'auteur original (seulement si ce n'est pas soi-même)
        if publication.auteur != request.user:
            creer_notification(
                destinataire=publication.auteur,
                acteur=request.user,
                type="partage",
                cible_type="repartage",       # ← nouveau type
                cible_id=nouvelle.id,          # ← pointe vers le REPARTAGE
            )

        return Response(
            {
                "id": str(nouvelle.id),
                "detail": "Publication repartagée sur ton mur.",
            },
            status=201,
        )

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def verifier_repartage(self, request, pk=None):
        """Vérifie si l'utilisateur a déjà republié cette publication."""
        publication = self.get_object()
        existe = Publication.objects.filter(
            auteur=request.user,
            publication_origine=publication,
            type="partage",
        ).exists()
        return Response({"deja_republie": existe})

class CommentaireViewSet(viewsets.ModelViewSet):
    serializer_class = CommentaireSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, EstAuteurOuLectureSeule]
    pagination_class = FilPagination

    def get_queryset(self):
        qs = Commentaire.objects.select_related(
            "auteur__profil"
        ).filter(statut="visible")
        cible_type = self.request.query_params.get("cible_type")
        cible_id = self.request.query_params.get("cible_id")
        if cible_type:
            qs = qs.filter(cible_type=cible_type)
        if cible_id:
            qs = qs.filter(cible_id=cible_id, parent__isnull=True)
        return qs

    def perform_create(self, serializer):
        c = serializer.save(auteur=self.request.user)
        if c.cible_type == "publication":
            Publication.objects.filter(pk=c.cible_id).update(
                nb_commentaires=F("nb_commentaires") + 1
            )
            try:
                pub = Publication.objects.get(pk=c.cible_id)
                creer_notification(
                    destinataire=pub.auteur,
                    acteur=self.request.user,
                    type="commentaire",
                    cible_type="publication",
                    cible_id=pub.id,
                )
            except Publication.DoesNotExist:
                pass

    def perform_destroy(self, instance):
        """Décrémente le compteur quand un commentaire est supprimé."""
        cible_type = instance.cible_type
        cible_id = instance.cible_id
        instance.delete()
        if cible_type == "publication":
            Publication.objects.filter(pk=cible_id).update(
                nb_commentaires=F("nb_commentaires") - 1
            )


class EnregistrementViewSet(viewsets.ModelViewSet):
    """Marque-pages : l'utilisateur enregistre des publications ou vidéos."""
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return (
            Enregistrement.objects
            .filter(utilisateur=self.request.user)
            .order_by("-cree_le")
        )

    def create(self, request, *args, **kwargs):
        """Toggle : si déjà enregistré, on retire ; sinon, on ajoute."""
        cible_type = request.data.get("cible_type")
        cible_id = request.data.get("cible_id")

        if not cible_type or not cible_id:
            return Response(
                {"detail": "cible_type et cible_id sont requis."},
                status=400,
            )

        obj, created = Enregistrement.objects.get_or_create(
            utilisateur=request.user,
            cible_type=cible_type,
            cible_id=cible_id,
            defaults={"collection": request.data.get("collection", "")},
        )

        if not created:
            obj.delete()
            return Response(
                {"enregistre": False, "detail": "Retiré des enregistrements."}
            )

        return Response(
            {
                "enregistre": True,
                "id": str(obj.id),
                "detail": "Contenu enregistré.",
            },
            status=201,
        )

    @action(detail=False, methods=["get"])
    def compter(self, request):
        """Compte les enregistrements de l'utilisateur."""
        n = Enregistrement.objects.filter(utilisateur=request.user).count()
        return Response({"total": n})

    @action(detail=False, methods=["get"])
    def verifier(self, request):
        """Vérifie si un contenu est enregistré."""
        cible_type = request.query_params.get("cible_type")
        cible_id = request.query_params.get("cible_id")
        if not cible_type or not cible_id:
            return Response(
                {"detail": "cible_type et cible_id sont requis."}, status=400
            )

        existe = Enregistrement.objects.filter(
            utilisateur=request.user,
            cible_type=cible_type,
            cible_id=cible_id,
        ).exists()
        return Response({"enregistre": existe})

    @action(detail=False, methods=["get"])
    def liste(self, request):
        """Récupère la liste des enregistrements avec les contenus complets."""
        from apps.videos.models import Video

        enregistrements = self.get_queryset()
        publication_ids = []
        video_ids = []

        for e in enregistrements:
            if e.cible_type == "publication":
                publication_ids.append(e.cible_id)
            elif e.cible_type == "video":
                video_ids.append(e.cible_id)

        publications_map = {
            str(p.id): p
            for p in Publication.objects.filter(id__in=publication_ids).select_related(
                "auteur__profil", "video", "verset"
            )
        }

        videos_map = {
            str(v.id): v
            for v in Video.objects.filter(id__in=video_ids).select_related(
                "auteur__profil"
            )
        }

        resultats = []
        for e in enregistrements:
            if e.cible_type == "publication" and str(e.cible_id) in publications_map:
                from .serializers import PublicationSerializer
                pub = publications_map[str(e.cible_id)]
                resultats.append({
                    "enregistrement_id": str(e.id),
                    "cible_type": "publication",
                    "cree_le": e.cree_le,
                    "publication": PublicationSerializer(
                        pub, context={"request": request}
                    ).data,
                })
            elif e.cible_type == "video" and str(e.cible_id) in videos_map:
                from apps.videos.serializers import VideoDetailSerializer
                vid = videos_map[str(e.cible_id)]
                resultats.append({
                    "enregistrement_id": str(e.id),
                    "cible_type": "video",
                    "cree_le": e.cree_le,
                    "video": VideoDetailSerializer(
                        vid, context={"request": request}
                    ).data,
                })

        return Response(resultats)

class PartageViewSet(viewsets.ModelViewSet):
    serializer_class = PartageSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        p = serializer.save(utilisateur=self.request.user)
        if p.cible_type == "publication":
            Publication.objects.filter(pk=p.cible_id).update(
                nb_partages=F("nb_partages") + 1
            )
