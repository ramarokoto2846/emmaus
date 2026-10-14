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
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Enregistrement.objects.filter(utilisateur=self.request.user)

    def perform_create(self, serializer):
        serializer.save(utilisateur=self.request.user)


class PartageViewSet(viewsets.ModelViewSet):
    serializer_class = PartageSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        p = serializer.save(utilisateur=self.request.user)
        if p.cible_type == "publication":
            Publication.objects.filter(pk=p.cible_id).update(
                nb_partages=F("nb_partages") + 1
            )
