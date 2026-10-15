from rest_framework import serializers

from apps.accounts.models import Profil
from apps.videos.serializers import VideoListeSerializer, VersetSerializer
from .models import Amen, Commentaire, Enregistrement, Partage, Publication


class AuteurMiniSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="utilisateur.id", read_only=True)
    pseudo = serializers.CharField(source="utilisateur.pseudo", read_only=True)
    role = serializers.CharField(source="utilisateur.role", read_only=True)
    initiales = serializers.CharField(read_only=True)
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = Profil
        fields = ("id", "pseudo", "role", "nom_affiche", "initiales",
                  "avatar_url", "avatar", "sous_titre")

    def get_avatar(self, obj):
        if not obj.avatar:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.avatar.url)
        return obj.avatar.url


class CommentaireSerializer(serializers.ModelSerializer):
    auteur = AuteurMiniSerializer(source="auteur.profil", read_only=True)
    reponses = serializers.SerializerMethodField()
    parent_info = serializers.SerializerMethodField()          # ✅ AJOUT

    class Meta:
        model = Commentaire
        fields = ("id", "auteur", "cible_type", "cible_id", "parent",
                  "parent_info", "texte", "nb_amen", "statut",
                  "cree_le", "reponses")                        # ✅ AJOUT
        read_only_fields = ("auteur", "nb_amen", "statut", "cree_le")

    def get_reponses(self, obj):
        # ✅ Récursion + on propage le context (pour les URLs d'avatar)
        enfants = (
            obj.reponses
            .filter(statut="visible")
            .select_related("auteur__profil")
            .order_by("cree_le")
        )
        return CommentaireSerializer(
            enfants, many=True, context=self.context
        ).data

    def get_parent_info(self, obj):
        """Infos du commentaire parent (auteur + extrait)."""
        if not obj.parent:
            return None
        parent = obj.parent
        try:
            auteur_nom = parent.auteur.profil.nom_affiche
        except Exception:
            auteur_nom = parent.auteur.pseudo
        return {
            "id": str(parent.id),
            "auteur_nom": auteur_nom,
            "texte": (parent.texte or "")[:80],
        }


class PublicationSerializer(serializers.ModelSerializer):
    auteur = AuteurMiniSerializer(source="auteur.profil", read_only=True)
    video = VideoListeSerializer(read_only=True)
    verset = VersetSerializer(read_only=True)
    est_amen = serializers.SerializerMethodField()
    est_verifiee = serializers.SerializerMethodField()
    est_enregistree = serializers.SerializerMethodField()
    publication_origine = serializers.SerializerMethodField()

    class Meta:
        model = Publication
        fields = ("id", "auteur", "texte", "video", "verset", "type",
                  "visibilite", "epinglee", "nb_amen", "nb_commentaires",
                  "nb_partages", "cree_le", "est_amen", "est_verifiee",
                  "est_enregistree", "publication_origine")
        read_only_fields = ("auteur", "nb_amen", "nb_commentaires",
                            "nb_partages", "cree_le")

    def get_est_amen(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return Amen.objects.filter(
            utilisateur=request.user, cible_type="publication", cible_id=obj.id
        ).exists()

    def get_est_verifiee(self, obj):
        return obj.moderation_verifiee

    def get_publication_origine(self, obj):
        if not obj.publication_origine:
            return None
        origine = obj.publication_origine
        request = self.context.get("request")

        auteur_data = {
            "id": str(origine.auteur.id),
            "pseudo": origine.auteur.pseudo,
            "nom_affiche": origine.auteur.profil.nom_affiche,
            "initiales": origine.auteur.profil.initiales,
            "role": origine.auteur.role,
            "sous_titre": origine.auteur.profil.sous_titre,
            "avatar": (
                request.build_absolute_uri(origine.auteur.profil.avatar.url)
                if origine.auteur.profil.avatar and request
                else None
            ),
        }

        video_data = None
        if origine.video_id and origine.video:
            v = origine.video
            video_data = {
                "id": str(v.id),
                "titre": v.titre,
                "description": v.description,
                "fichier_url": (
                    request.build_absolute_uri(v.fichier.url)
                    if v.fichier and request
                    else v.fichier_url
                ),
                "miniature_url": (
                    request.build_absolute_uri(v.miniature.url)
                    if v.miniature and request
                    else v.miniature_url
                ),
                "duree": (
                    f"{v.duree_secondes // 60}:{v.duree_secondes % 60:02d}"
                    if v.duree_secondes
                    else None
                ),
                "type": v.type,
                "auteur_nom": v.auteur.profil.nom_affiche,
                "auteur_initiales": v.auteur.profil.initiales,
                "nb_vues": v.nb_vues,
                "nb_amen": v.nb_amen,
            }

        verset_data = None
        if origine.verset_id and origine.verset:
            vs = origine.verset
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
            "id": str(origine.id),
            "texte": origine.texte,
            "type": origine.type,
            "visibilite": origine.visibilite,
            "cree_le": origine.cree_le,
            "nb_amen": origine.nb_amen,
            "nb_commentaires": origine.nb_commentaires,
            "nb_partages": origine.nb_partages,
            "auteur": auteur_data,
            "video": video_data,
            "verset": verset_data,
        }

    def get_est_enregistree(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        from .models import Enregistrement
        return Enregistrement.objects.filter(
            utilisateur=request.user,
            cible_type="publication",
            cible_id=obj.id,
        ).exists()


class PublicationEcritureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Publication
        fields = ("id", "texte", "video", "verset", "type",
                  "visibilite", "epinglee")


class PartageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Partage
        fields = ("id", "cible_type", "cible_id", "canal", "cree_le")
        read_only_fields = ("cree_le",)