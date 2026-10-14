from rest_framework import serializers

from apps.accounts.models import Profil
from apps.videos.serializers import VideoListeSerializer, VersetSerializer
from .models import Amen, Commentaire, Enregistrement, Partage, Publication


class AuteurMiniSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="utilisateur.id", read_only=True)
    pseudo = serializers.CharField(source="utilisateur.pseudo", read_only=True)
    initiales = serializers.CharField(read_only=True)
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = Profil
        fields = ("id", "pseudo", "nom_affiche", "initiales",
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

    class Meta:
        model = Commentaire
        fields = ("id", "auteur", "cible_type", "cible_id", "parent",
                  "texte", "nb_amen", "statut", "cree_le", "reponses")
        read_only_fields = ("auteur", "nb_amen", "statut", "cree_le")

    def get_reponses(self, obj):
        return CommentaireSerializer(
            obj.reponses.filter(statut="visible"), many=True
        ).data


class PublicationSerializer(serializers.ModelSerializer):
    auteur = AuteurMiniSerializer(source="auteur.profil", read_only=True)
    video = VideoListeSerializer(read_only=True)
    verset = VersetSerializer(read_only=True)
    est_amen = serializers.SerializerMethodField()

    class Meta:
        model = Publication
        fields = ("id", "auteur", "texte", "video", "verset", "type",
                  "visibilite", "epinglee", "nb_amen", "nb_commentaires",
                  "nb_partages", "cree_le", "est_amen")
        read_only_fields = ("auteur", "nb_amen", "nb_commentaires",
                            "nb_partages", "cree_le")

    def get_est_amen(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return Amen.objects.filter(
            utilisateur=request.user, cible_type="publication", cible_id=obj.id
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
