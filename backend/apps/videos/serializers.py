from rest_framework import serializers

from apps.accounts.serializers import ProfilSerializer
from .models import (
    Serie,
    Theme,
    Verset,
    Video,
    VideoTheme,
    VideoVerset,
)


class ThemeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Theme
        fields = ("id", "nom", "slug", "tendance")


class VersetSerializer(serializers.ModelSerializer):
    reference = serializers.CharField(read_only=True)

    class Meta:
        model = Verset
        fields = (
            "id",
            "livre",
            "chapitre",
            "verset_debut",
            "verset_fin",
            "traduction",
            "texte",
            "reference",
            "actif_sidebar",
        )


class SerieSerializer(serializers.ModelSerializer):
    nb_videos = serializers.IntegerField(source="videos.count", read_only=True)

    class Meta:
        model = Serie
        fields = ("id", "titre", "description", "image_url", "nb_videos", "cree_le")


class VideoListeSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.CharField(source="auteur.profil.nom_affiche", read_only=True)
    auteur_initiales = serializers.CharField(source="auteur.profil.initiales", read_only=True)
    duree = serializers.SerializerMethodField()
    fichier_url = serializers.SerializerMethodField()
    miniature_url = serializers.SerializerMethodField()
    est_verifiee = serializers.SerializerMethodField()

    class Meta:
        model = Video
        fields = (
            "id", "titre", "description", "miniature_url", "fichier_url",
            "duree_secondes", "duree", "format", "type", "statut", "visibilite",
            "nb_vues", "nb_amen", "nb_commentaires",
            "publie_le", "auteur_nom", "auteur_initiales", "est_verifiee",
        )

    def get_duree(self, obj):
        if obj.duree_secondes is None:
            return None
        m, s = divmod(obj.duree_secondes, 60)
        return f"{m}:{s:02d}"

    def get_est_verifiee(self, obj):
        """True si un modérateur a déjà examiné cette vidéo."""
        return obj.moderation_verifiee

    def _url_absolue(self, request, fichier):
        if not fichier:
            return None
        try:
            url = fichier.url
            return request.build_absolute_uri(url) if request else url
        except Exception:
            return None

    def get_fichier_url(self, obj):
        request = self.context.get("request")
        if obj.fichier:
            return self._url_absolue(request, obj.fichier)
        return obj.fichier_url or None

    def get_miniature_url(self, obj):
        request = self.context.get("request")
        if obj.miniature:
            return self._url_absolue(request, obj.miniature)
        return obj.miniature_url or None


class VideoDetailSerializer(VideoListeSerializer):
    auteur = ProfilSerializer(source="auteur.profil", read_only=True)
    themes = ThemeSerializer(source="themes_lies.theme", many=True, read_only=True)
    versets = VersetSerializer(source="versets_lies.verset", many=True, read_only=True)
    serie = SerieSerializer(read_only=True)

    class Meta(VideoListeSerializer.Meta):
        fields = VideoListeSerializer.Meta.fields + (
            "auteur", "eglise", "serie", "numero_episode",
            "commentaires_actifs", "themes", "versets", "cree_le", "modifie_le",
        )


class VideoEcritureSerializer(serializers.ModelSerializer):
    theme_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )
    verset_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )

    class Meta:
        model = Video
        fields = (
            "id", "titre", "description", "fichier_url", "miniature_url",
            "duree_secondes", "format", "type", "serie", "numero_episode",
            "statut", "visibilite", "commentaires_actifs", "eglise",
            "theme_ids", "verset_ids",
        )

    def create(self, validated_data):
        theme_ids = validated_data.pop("theme_ids", [])
        verset_ids = validated_data.pop("verset_ids", [])
        video = Video.objects.create(auteur=self.context["request"].user, **validated_data)
        VideoTheme.objects.bulk_create(
            [VideoTheme(video=video, theme_id=t) for t in theme_ids]
        )
        VideoVerset.objects.bulk_create(
            [VideoVerset(video=video, verset_id=v) for v in verset_ids]
        )
        return video

    def update(self, instance, validated_data):
        theme_ids = validated_data.pop("theme_ids", None)
        verset_ids = validated_data.pop("verset_ids", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if theme_ids is not None:
            VideoTheme.objects.filter(video=instance).delete()
            VideoTheme.objects.bulk_create(
                [VideoTheme(video=instance, theme_id=t) for t in theme_ids]
            )
        if verset_ids is not None:
            VideoVerset.objects.filter(video=instance).delete()
            VideoVerset.objects.bulk_create(
                [VideoVerset(video=instance, verset_id=v) for v in verset_ids]
            )
        return instance
