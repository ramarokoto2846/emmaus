from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from apps.common.permissions import EstModerateur
from apps.notifications.services import creer_notification
from .models import Blocage, RechercheRecente, Signalement
from .serializers import (BlocageSerializer, RechercheRecenteSerializer,
                          SignalementSerializer)


class SignalementViewSet(viewsets.ModelViewSet):
    queryset = Signalement.objects.select_related("auteur", "traite_par")
    serializer_class = SignalementSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["statut", "motif", "cible_type"]

    def create(self, request, *args, **kwargs):
        """Refuse un signalement si la cible a déjà été examinée par un modérateur."""
        cible_type = request.data.get("cible_type")
        cible_id = request.data.get("cible_id")

        if cible_type and cible_id:
            # Vérifier le champ moderation_verifiee directement sur la cible
            deja_verifiee = False

            if cible_type == "publication":
                from apps.feed.models import Publication
                pub = Publication.objects.filter(pk=cible_id).first()
                if pub and pub.moderation_verifiee:
                    deja_verifiee = True

            elif cible_type == "video":
                from apps.videos.models import Video
                v = Video.objects.filter(pk=cible_id).first()
                if v and v.moderation_verifiee:
                    deja_verifiee = True

            elif cible_type == "commentaire":
                from apps.feed.models import Commentaire
                c = Commentaire.objects.filter(pk=cible_id).first()
                if c and c.moderation_verifiee:
                    deja_verifiee = True

            if deja_verifiee:
                return Response(
                    {
                        "detail": "Ce contenu a déjà été examiné par un modérateur.",
                        "deja_traite": True,
                    },
                    status=400,
                )

        return super().create(request, *args, **kwargs)


    def create(self, request, *args, **kwargs):
        """Refuse un signalement si la cible a déjà été examinée par un admin."""
        cible_type = request.data.get("cible_type")
        cible_id = request.data.get("cible_id")

        if cible_type and cible_id:
            deja_traite = Signalement.objects.filter(
                cible_type=cible_type,
                cible_id=cible_id,
                statut="traite",
            ).exists()

            if deja_traite:
                return Response(
                    {
                        "detail": "Ce contenu a déjà été examiné par un modérateur.",
                        "deja_traite": True,
                    },
                    status=400,
                )

        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        sig = serializer.save(auteur=self.request.user)

        # Traiter selon le type de cible
        if sig.cible_type == "publication":
            self._traiter_publication(sig)
        elif sig.cible_type == "video":
            self._traiter_video(sig)
        elif sig.cible_type == "commentaire":
            self._traiter_commentaire(sig)

    def _traiter_publication(self, sig):
        from apps.feed.models import Publication
        try:
            pub = Publication.objects.get(pk=sig.cible_id)
        except Publication.DoesNotExist:
            return

        # Masquer automatiquement
        if pub.visibilite != "prive":
            Publication.objects.filter(pk=pub.pk).update(visibilite="prive")

        # Notifier l'auteur (sans mentionner le signaleur)
        creer_notification(
            destinataire=pub.auteur,
            acteur=None,
            type="signalement",
            cible_type="publication",
            cible_id=pub.id,
        )

    def _traiter_video(self, sig):
        from apps.videos.models import Video, StatutVideo
        try:
            vid = Video.objects.get(pk=sig.cible_id)
        except Video.DoesNotExist:
            return

        Video.objects.filter(pk=vid.pk).update(statut=StatutVideo.MASQUE)
        creer_notification(
            destinataire=vid.auteur,
            acteur=None,
            type="signalement",
            cible_type="video",
            cible_id=vid.id,
        )

    def _traiter_commentaire(self, sig):
        from apps.feed.models import Commentaire, Publication
        from django.db.models import F

        try:
            c = Commentaire.objects.get(pk=sig.cible_id)
        except Commentaire.DoesNotExist:
            return

        if c.statut != "visible":
            return  # déjà masqué

        Commentaire.objects.filter(pk=c.pk).update(statut="masque")

        # Décrémenter le compteur de la publication
        if c.cible_type == "publication":
            Publication.objects.filter(pk=c.cible_id).update(
                nb_commentaires=F("nb_commentaires") - 1
            )

        creer_notification(
            destinataire=c.auteur,
            acteur=None,
            type="signalement",
            cible_type="commentaire",
            cible_id=c.id,
        )
    
    def remettre(self, request, pk=None):
        """Un modérateur remet la publication/vidéo en ligne."""
        if request.user.role not in ("moderateur", "admin"):
            return Response({"detail": "Non autorisé."}, status=403)

        sig = self.get_object()

        if sig.cible_type == "publication":
            from apps.feed.models import Publication
            Publication.objects.filter(pk=sig.cible_id).update(
                visibilite="public",
                moderation_verifiee=True,
            )
        elif sig.cible_type == "video":
            from apps.videos.models import Video, StatutVideo
            Video.objects.filter(pk=sig.cible_id).update(
                statut=StatutVideo.PUBLIE,
                moderation_verifiee=True,
            )
        elif sig.cible_type == "commentaire":
            from apps.feed.models import Commentaire, Publication
            from django.db.models import F
            c = Commentaire.objects.filter(pk=sig.cible_id).first()
            if c:
                Commentaire.objects.filter(pk=c.pk).update(
                    statut="visible",
                    moderation_verifiee=True,
                )
                if c.statut != "visible" and c.cible_type == "publication":
                    Publication.objects.filter(pk=c.cible_id).update(
                        nb_commentaires=F("nb_commentaires") + 1
                    )

        sig.statut = "rejete"
        sig.traite_par = request.user
        sig.save(update_fields=["statut", "traite_par"])

        return Response(SignalementSerializer(sig).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def confirmer(self, request, pk=None):
        """Un modérateur confirme le signalement."""
        if request.user.role not in ("moderateur", "admin"):
            return Response({"detail": "Non autorisé."}, status=403)

        sig = self.get_object()
        sig.statut = "traite"
        sig.traite_par = request.user
        sig.save(update_fields=["statut", "traite_par"])

        return Response(SignalementSerializer(sig).data)


class BlocageViewSet(viewsets.ModelViewSet):
    serializer_class = BlocageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Blocage.objects.filter(utilisateur=self.request.user)

    def perform_create(self, serializer):
        serializer.save(utilisateur=self.request.user)


class RechercheRecenteViewSet(viewsets.ModelViewSet):
    serializer_class = RechercheRecenteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RechercheRecente.objects.filter(utilisateur=self.request.user)

    def perform_create(self, serializer):
        serializer.save(utilisateur=self.request.user)

class ModerationViewSet(viewsets.GenericViewSet):
    """Espace modérateur : examiner, remettre, confirmer."""
    permission_classes = [IsAuthenticated]
    serializer_class = SignalementSerializer
    queryset = Signalement.objects.all()

    def _verifier_role(self, request):
        if request.user.role not in ("moderateur", "admin"):
            return False
        return True

    @action(detail=False, methods=["get"])
    def signalements_ouverts(self, request):
        """Liste les signalements avec statut=ouvert + contenu associé."""
        if not self._verifier_role(request):
            return Response({"detail": "Non autorisé."}, status=403)

        qs = (
            Signalement.objects
            .filter(statut="ouvert")
            .select_related("auteur", "auteur__profil")
            .order_by("-cree_le")
        )

        resultats = []
        for s in qs:
            item = {
                "id": str(s.id),
                "motif": s.motif,
                "details": s.details,
                "cree_le": s.cree_le,
                "auteur_signalement": {
                    "id": str(s.auteur.id),
                    "pseudo": s.auteur.pseudo,
                    "nom_affiche": s.auteur.profil.nom_affiche,
                    "avatar": self._avatar_url(request, s.auteur.profil),
                },
                "cible_type": s.cible_type,
                "cible_id": str(s.cible_id),
                "cible": self._charger_cible(s),
                "nb_signalements": Signalement.objects.filter(
                    cible_type=s.cible_type, cible_id=s.cible_id
                ).count(),
            }
            resultats.append(item)

        return Response(resultats)

    def _avatar_url(self, request, profil):
        if not profil.avatar:
            return None
        return request.build_absolute_uri(profil.avatar.url)

    def _charger_cible(self, s):
        if s.cible_type == "publication":
            from apps.feed.models import Publication
            from apps.videos.models import Video

            pub = (
                Publication.objects
                .filter(pk=s.cible_id)
                .select_related("auteur__profil", "video", "verset")
                .first()
            )
            if not pub:
                return None

            # Infos de la vidéo liée (si présente)
            video_data = None
            if pub.video_id:
                v = pub.video
                fichier_url = None
                miniature_url = None

                if v.fichier:
                    try:
                        fichier_url = self.request.build_absolute_uri(v.fichier.url)
                    except Exception:
                        fichier_url = v.fichier_url or None
                elif v.fichier_url:
                    fichier_url = v.fichier_url

                if v.miniature:
                    try:
                        miniature_url = self.request.build_absolute_uri(v.miniature.url)
                    except Exception:
                        miniature_url = v.miniature_url or None
                elif v.miniature_url:
                    miniature_url = v.miniature_url

                video_data = {
                    "id": str(v.id),
                    "titre": v.titre,
                    "description": v.description,
                    "fichier_url": fichier_url,
                    "miniature_url": miniature_url,
                    "duree_secondes": v.duree_secondes,
                    "duree": (
                        f"{v.duree_secondes // 60}:{v.duree_secondes % 60:02d}"
                        if v.duree_secondes
                        else None
                    ),
                    "type": v.type,
                    "format": v.format,
                    "statut": v.statut,
                }

            # Infos du verset lié (si présent)
            verset_data = None
            if pub.verset_id:
                vs = pub.verset
                verset_data = {
                    "id": vs.id,
                    "livre": vs.livre,
                    "chapitre": vs.chapitre,
                    "verset_debut": vs.verset_debut,
                    "verset_fin": vs.verset_fin,
                    "traduction": vs.traduction,
                    "texte": vs.texte,
                    "reference": vs.reference,
                }

            return {
                "type": "publication",
                "id": str(pub.id),
                "texte": pub.texte,
                "visibilite": pub.visibilite,
                "cree_le": pub.cree_le,
                "video": video_data,
                "verset": verset_data,
                "auteur": {
                    "id": str(pub.auteur.id),
                    "pseudo": pub.auteur.pseudo,
                    "nom_affiche": pub.auteur.profil.nom_affiche,
                },
            }
        elif s.cible_type == "video":
            from apps.videos.models import Video
            v = Video.objects.filter(pk=s.cible_id).select_related(
                "auteur__profil"
            ).first()
            if not v:
                return None

            # URLs absolues
            fichier_url = None
            miniature_url = None
            if v.fichier:
                try:
                    fichier_url = self.request.build_absolute_uri(v.fichier.url)
                except Exception:
                    fichier_url = v.fichier_url or None
            elif v.fichier_url:
                fichier_url = v.fichier_url

            if v.miniature:
                try:
                    miniature_url = self.request.build_absolute_uri(v.miniature.url)
                except Exception:
                    miniature_url = v.miniature_url or None
            elif v.miniature_url:
                miniature_url = v.miniature_url

            return {
                "type": "video",
                "id": str(v.id),
                "titre": v.titre,
                "description": v.description,
                "statut": v.statut,
                "cree_le": v.cree_le,
                "fichier_url": fichier_url,
                "miniature_url": miniature_url,
                "duree": (
                    f"{v.duree_secondes // 60}:{v.duree_secondes % 60:02d}"
                    if v.duree_secondes
                    else None
                ),
                "auteur": {
                    "id": str(v.auteur.id),
                    "pseudo": v.auteur.pseudo,
                    "nom_affiche": v.auteur.profil.nom_affiche,
                },
            }
        elif s.cible_type == "commentaire":
            from apps.feed.models import Commentaire
            c = Commentaire.objects.filter(pk=s.cible_id).select_related(
                "auteur__profil"
            ).first()
            if not c:
                return None
            return {
                "type": "commentaire",
                "id": str(c.id),
                "texte": c.texte,
                "statut": c.statut,
                "cree_le": c.cree_le,
                "auteur": {
                    "id": str(c.auteur.id),
                    "pseudo": c.auteur.pseudo,
                    "nom_affiche": c.auteur.profil.nom_affiche,
                },
            }
        return None

    @action(detail=False, methods=["get"])
    def compter(self, request):
        """Compte les signalements ouverts (pour badge)."""
        if not self._verifier_role(request):
            return Response({"detail": "Non autorisé."}, status=403)

        n = Signalement.objects.filter(statut="ouvert").count()
        return Response({"ouverts": n})

    @action(detail=False, methods=["post"])
    def remettre(self, request):
        """Remettre la cible en ligne."""
        if not self._verifier_role(request):
            return Response({"detail": "Non autorisé."}, status=403)

        sig_id = request.data.get("signalement_id")
        if not sig_id:
            return Response({"detail": "signalement_id requis."}, status=400)

        try:
            sig = Signalement.objects.get(pk=sig_id)
        except Signalement.DoesNotExist:
            return Response({"detail": "Signalement introuvable."}, status=404)

        if sig.cible_type == "publication":
            from apps.feed.models import Publication
            Publication.objects.filter(pk=sig.cible_id).update(
                visibilite="public",
                moderation_verifiee=True,
            )
        elif sig.cible_type == "video":
            from apps.videos.models import Video, StatutVideo
            Video.objects.filter(pk=sig.cible_id).update(
                statut=StatutVideo.PUBLIE,
                moderation_verifiee=True,
            )
        elif sig.cible_type == "commentaire":
            from apps.feed.models import Commentaire, Publication
            from django.db.models import F
            c = Commentaire.objects.filter(pk=sig.cible_id).first()
            if c:
                Commentaire.objects.filter(pk=c.pk).update(
                    statut="visible",
                    moderation_verifiee=True,
                )
                if c.statut != "visible" and c.cible_type == "publication":
                    Publication.objects.filter(pk=c.cible_id).update(
                        nb_commentaires=F("nb_commentaires") + 1
                    )

        # Marquer tous les signalements de cette cible comme rejetés
        Signalement.objects.filter(
            cible_type=sig.cible_type, cible_id=sig.cible_id, statut="ouvert"
        ).update(statut="rejete", traite_par=request.user)

        # Notifier l'auteur (pas de mention du modérateur)
        self._notifier_auteur(sig, "remise")

        return Response({"status": "remis"})

    @action(detail=False, methods=["post"])
    def confirmer(self, request):
        """Confirmer la suspension (contenu reste masqué)."""
        if not self._verifier_role(request):
            return Response({"detail": "Non autorisé."}, status=403)

        sig_id = request.data.get("signalement_id")
        if not sig_id:
            return Response({"detail": "signalement_id requis."}, status=400)

        try:
            sig = Signalement.objects.get(pk=sig_id)
        except Signalement.DoesNotExist:
            return Response({"detail": "Signalement introuvable."}, status=404)

        # Marquer la cible comme vérifiée (peu importe la décision)
        if sig.cible_type == "publication":
            from apps.feed.models import Publication
            Publication.objects.filter(pk=sig.cible_id).update(moderation_verifiee=True)
        elif sig.cible_type == "video":
            from apps.videos.models import Video
            Video.objects.filter(pk=sig.cible_id).update(moderation_verifiee=True)
        elif sig.cible_type == "commentaire":
            from apps.feed.models import Commentaire
            Commentaire.objects.filter(pk=sig.cible_id).update(moderation_verifiee=True)

        Signalement.objects.filter(
            cible_type=sig.cible_type, cible_id=sig.cible_id, statut="ouvert"
        ).update(statut="traite", traite_par=request.user)

        self._notifier_auteur(sig, "confirmee")

        return Response({"status": "confirme"})


    @action(detail=False, methods=["post"])
    def supprimer_definitif(self, request):
        """Supprime définitivement le contenu signalé."""
        if not self._verifier_role(request):
            return Response({"detail": "Non autorisé."}, status=403)

        sig_id = request.data.get("signalement_id")
        if not sig_id:
            return Response({"detail": "signalement_id requis."}, status=400)

        try:
            sig = Signalement.objects.get(pk=sig_id)
        except Signalement.DoesNotExist:
            return Response({"detail": "Signalement introuvable."}, status=404)

        # Notifier l'auteur AVANT suppression
        self._notifier_auteur(sig, "supprimee")

        # Supprimer définitivement le contenu
        if sig.cible_type == "publication":
            from apps.feed.models import Publication
            Publication.objects.filter(pk=sig.cible_id).delete()
        elif sig.cible_type == "video":
            from apps.videos.models import Video
            Video.objects.filter(pk=sig.cible_id).delete()
        elif sig.cible_type == "commentaire":
            from apps.feed.models import Commentaire
            Commentaire.objects.filter(pk=sig.cible_id).delete()

        # Marquer les signalements comme traités
        Signalement.objects.filter(
            cible_type=sig.cible_type,
            cible_id=sig.cible_id,
            statut="ouvert",
        ).update(statut="traite", traite_par=request.user)

        return Response({"status": "supprime"})

    def _notifier_auteur(self, sig, action):
        """Notifie l'auteur de la décision du modérateur."""
        from apps.feed.models import Publication, Commentaire
        from apps.videos.models import Video
        from apps.notifications.services import creer_notification

        auteur = None
        cible_type = sig.cible_type
        cible_id = sig.cible_id

        if cible_type == "publication":
            pub = Publication.objects.filter(pk=cible_id).first()
            auteur = pub.auteur if pub else None
        elif cible_type == "video":
            v = Video.objects.filter(pk=cible_id).first()
            auteur = v.auteur if v else None
        elif cible_type == "commentaire":
            c = Commentaire.objects.filter(pk=cible_id).first()
            auteur = c.auteur if c else None

        if not auteur:
            return

        # Le type de notification dépend de l'action
        if action == "remise":
            type_notif = "signalement_leve"
        elif action == "confirmee":
            type_notif = "signalement_confirme"
        elif action == "supprimee":
            type_notif = "suppression_contenu"
        else:
            type_notif = "signalement"

        creer_notification(
            destinataire=auteur,
            acteur=None,
            type=type_notif,
            cible_type=cible_type,
            cible_id=cible_id,
        )

class ModerationViewSet(viewsets.GenericViewSet):
    """Espace modérateur : examiner, remettre, confirmer."""
    permission_classes = [IsAuthenticated]
    serializer_class = SignalementSerializer
    queryset = Signalement.objects.all()

    def _verifier_role(self, request):
        if request.user.role not in ("moderateur", "admin"):
            return False
        return True

    @action(detail=False, methods=["get"])
    def signalements_ouverts(self, request):
        """Liste les signalements avec statut=ouvert + contenu associé."""
        if not self._verifier_role(request):
            return Response({"detail": "Non autorisé."}, status=403)

        qs = (
            Signalement.objects
            .filter(statut="ouvert")
            .select_related("auteur", "auteur__profil")
            .order_by("-cree_le")
        )

        resultats = []
        for s in qs:
            item = {
                "id": str(s.id),
                "motif": s.motif,
                "details": s.details,
                "cree_le": s.cree_le,
                "auteur_signalement": {
                    "id": str(s.auteur.id),
                    "pseudo": s.auteur.pseudo,
                    "nom_affiche": s.auteur.profil.nom_affiche,
                    "avatar": self._avatar_url(request, s.auteur.profil),
                },
                "cible_type": s.cible_type,
                "cible_id": str(s.cible_id),
                "cible": self._charger_cible(s),
                "nb_signalements": Signalement.objects.filter(
                    cible_type=s.cible_type, cible_id=s.cible_id
                ).count(),
            }
            resultats.append(item)

        return Response(resultats)

    def _avatar_url(self, request, profil):
        if not profil.avatar:
            return None
        return request.build_absolute_uri(profil.avatar.url)

    def _charger_cible(self, s):
        if s.cible_type == "publication":
            from apps.feed.models import Publication
            from apps.videos.models import Video

            pub = (
                Publication.objects
                .filter(pk=s.cible_id)
                .select_related("auteur__profil", "video", "verset")
                .first()
            )
            if not pub:
                return None

            # Infos de la vidéo liée (si présente)
            video_data = None
            if pub.video_id:
                v = pub.video
                fichier_url = None
                miniature_url = None

                if v.fichier:
                    try:
                        fichier_url = self.request.build_absolute_uri(v.fichier.url)
                    except Exception:
                        fichier_url = v.fichier_url or None
                elif v.fichier_url:
                    fichier_url = v.fichier_url

                if v.miniature:
                    try:
                        miniature_url = self.request.build_absolute_uri(v.miniature.url)
                    except Exception:
                        miniature_url = v.miniature_url or None
                elif v.miniature_url:
                    miniature_url = v.miniature_url

                video_data = {
                    "id": str(v.id),
                    "titre": v.titre,
                    "description": v.description,
                    "fichier_url": fichier_url,
                    "miniature_url": miniature_url,
                    "duree_secondes": v.duree_secondes,
                    "duree": (
                        f"{v.duree_secondes // 60}:{v.duree_secondes % 60:02d}"
                        if v.duree_secondes
                        else None
                    ),
                    "type": v.type,
                    "format": v.format,
                    "statut": v.statut,
                }

            # Infos du verset lié (si présent)
            verset_data = None
            if pub.verset_id:
                vs = pub.verset
                verset_data = {
                    "id": vs.id,
                    "livre": vs.livre,
                    "chapitre": vs.chapitre,
                    "verset_debut": vs.verset_debut,
                    "verset_fin": vs.verset_fin,
                    "traduction": vs.traduction,
                    "texte": vs.texte,
                    "reference": vs.reference,
                }

            return {
                "type": "publication",
                "id": str(pub.id),
                "texte": pub.texte,
                "visibilite": pub.visibilite,
                "cree_le": pub.cree_le,
                "video": video_data,
                "verset": verset_data,
                "auteur": {
                    "id": str(pub.auteur.id),
                    "pseudo": pub.auteur.pseudo,
                    "nom_affiche": pub.auteur.profil.nom_affiche,
                },
            }
        elif s.cible_type == "video":
            from apps.videos.models import Video
            v = Video.objects.filter(pk=s.cible_id).select_related(
                "auteur__profil"
            ).first()
            if not v:
                return None

            # URLs absolues
            fichier_url = None
            miniature_url = None
            if v.fichier:
                try:
                    fichier_url = self.request.build_absolute_uri(v.fichier.url)
                except Exception:
                    fichier_url = v.fichier_url or None
            elif v.fichier_url:
                fichier_url = v.fichier_url

            if v.miniature:
                try:
                    miniature_url = self.request.build_absolute_uri(v.miniature.url)
                except Exception:
                    miniature_url = v.miniature_url or None
            elif v.miniature_url:
                miniature_url = v.miniature_url

            return {
                "type": "video",
                "id": str(v.id),
                "titre": v.titre,
                "description": v.description,
                "statut": v.statut,
                "cree_le": v.cree_le,
                "fichier_url": fichier_url,
                "miniature_url": miniature_url,
                "duree": (
                    f"{v.duree_secondes // 60}:{v.duree_secondes % 60:02d}"
                    if v.duree_secondes
                    else None
                ),
                "auteur": {
                    "id": str(v.auteur.id),
                    "pseudo": v.auteur.pseudo,
                    "nom_affiche": v.auteur.profil.nom_affiche,
                },
            }
        elif s.cible_type == "commentaire":
            from apps.feed.models import Commentaire
            c = Commentaire.objects.filter(pk=s.cible_id).select_related(
                "auteur__profil"
            ).first()
            if not c:
                return None
            return {
                "type": "commentaire",
                "id": str(c.id),
                "texte": c.texte,
                "statut": c.statut,
                "cree_le": c.cree_le,
                "auteur": {
                    "id": str(c.auteur.id),
                    "pseudo": c.auteur.pseudo,
                    "nom_affiche": c.auteur.profil.nom_affiche,
                },
            }
        return None

    @action(detail=False, methods=["get"])
    def compter(self, request):
        """Compte les signalements ouverts (pour badge)."""
        if not self._verifier_role(request):
            return Response({"detail": "Non autorisé."}, status=403)

        n = Signalement.objects.filter(statut="ouvert").count()
        return Response({"ouverts": n})

    @action(detail=False, methods=["post"])
    def remettre(self, request):
        """Remettre la cible en ligne."""
        if not self._verifier_role(request):
            return Response({"detail": "Non autorisé."}, status=403)

        sig_id = request.data.get("signalement_id")
        if not sig_id:
            return Response({"detail": "signalement_id requis."}, status=400)

        try:
            sig = Signalement.objects.get(pk=sig_id)
        except Signalement.DoesNotExist:
            return Response({"detail": "Signalement introuvable."}, status=404)

        if sig.cible_type == "publication":
            from apps.feed.models import Publication
            Publication.objects.filter(pk=sig.cible_id).update(
                visibilite="public",
                moderation_verifiee=True,
            )
        elif sig.cible_type == "video":
            from apps.videos.models import Video, StatutVideo
            Video.objects.filter(pk=sig.cible_id).update(
                statut=StatutVideo.PUBLIE,
                moderation_verifiee=True,
            )
        elif sig.cible_type == "commentaire":
            from apps.feed.models import Commentaire, Publication
            from django.db.models import F
            c = Commentaire.objects.filter(pk=sig.cible_id).first()
            if c:
                Commentaire.objects.filter(pk=c.pk).update(
                    statut="visible",
                    moderation_verifiee=True,
                )
                if c.statut != "visible" and c.cible_type == "publication":
                    Publication.objects.filter(pk=c.cible_id).update(
                        nb_commentaires=F("nb_commentaires") + 1
                    )

        # Marquer tous les signalements de cette cible comme rejetés
        Signalement.objects.filter(
            cible_type=sig.cible_type, cible_id=sig.cible_id, statut="ouvert"
        ).update(statut="rejete", traite_par=request.user)

        # Notifier l'auteur (pas de mention du modérateur)
        self._notifier_auteur(sig, "remise")

        return Response({"status": "remis"})

    @action(detail=False, methods=["post"])
    def confirmer(self, request):
        """Confirmer la suspension (contenu reste masqué)."""
        if not self._verifier_role(request):
            return Response({"detail": "Non autorisé."}, status=403)

        sig_id = request.data.get("signalement_id")
        if not sig_id:
            return Response({"detail": "signalement_id requis."}, status=400)

        try:
            sig = Signalement.objects.get(pk=sig_id)
        except Signalement.DoesNotExist:
            return Response({"detail": "Signalement introuvable."}, status=404)

        # Marquer la cible comme vérifiée (peu importe la décision)
        if sig.cible_type == "publication":
            from apps.feed.models import Publication
            Publication.objects.filter(pk=sig.cible_id).update(moderation_verifiee=True)
        elif sig.cible_type == "video":
            from apps.videos.models import Video
            Video.objects.filter(pk=sig.cible_id).update(moderation_verifiee=True)
        elif sig.cible_type == "commentaire":
            from apps.feed.models import Commentaire
            Commentaire.objects.filter(pk=sig.cible_id).update(moderation_verifiee=True)

        Signalement.objects.filter(
            cible_type=sig.cible_type, cible_id=sig.cible_id, statut="ouvert"
        ).update(statut="traite", traite_par=request.user)

        self._notifier_auteur(sig, "confirmee")

        return Response({"status": "confirme"})


    @action(detail=False, methods=["post"])
    def supprimer_definitif(self, request):
        """Supprime définitivement le contenu signalé."""
        if not self._verifier_role(request):
            return Response({"detail": "Non autorisé."}, status=403)

        sig_id = request.data.get("signalement_id")
        if not sig_id:
            return Response({"detail": "signalement_id requis."}, status=400)

        try:
            sig = Signalement.objects.get(pk=sig_id)
        except Signalement.DoesNotExist:
            return Response({"detail": "Signalement introuvable."}, status=404)

        # Notifier l'auteur AVANT suppression
        self._notifier_auteur(sig, "supprimee")

        # Supprimer définitivement le contenu
        if sig.cible_type == "publication":
            from apps.feed.models import Publication
            Publication.objects.filter(pk=sig.cible_id).delete()
        elif sig.cible_type == "video":
            from apps.videos.models import Video
            Video.objects.filter(pk=sig.cible_id).delete()
        elif sig.cible_type == "commentaire":
            from apps.feed.models import Commentaire
            Commentaire.objects.filter(pk=sig.cible_id).delete()

        # Marquer les signalements comme traités
        Signalement.objects.filter(
            cible_type=sig.cible_type,
            cible_id=sig.cible_id,
            statut="ouvert",
        ).update(statut="traite", traite_par=request.user)

        return Response({"status": "supprime"})

    def _notifier_auteur(self, sig, action):
        from apps.feed.models import Publication, Commentaire
        from apps.videos.models import Video
        from apps.notifications.services import creer_notification

        auteur = None
        if sig.cible_type == "publication":
            pub = Publication.objects.filter(pk=sig.cible_id).first()
            auteur = pub.auteur if pub else None
        elif sig.cible_type == "video":
            v = Video.objects.filter(pk=sig.cible_id).first()
            auteur = v.auteur if v else None
        elif sig.cible_type == "commentaire":
            c = Commentaire.objects.filter(pk=sig.cible_id).first()
            auteur = c.auteur if c else None

        if not auteur:
            return

        creer_notification(
            destinataire=auteur,
            acteur=None,
            type="signalement",
            cible_type=sig.cible_type,
            cible_id=sig.cible_id,
        )
