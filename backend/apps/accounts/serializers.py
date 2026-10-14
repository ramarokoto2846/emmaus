from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Abonnement, Eglise, EgliseMembre, Profil, Utilisateur


class UtilisateurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Utilisateur
        fields = ("id", "email", "pseudo", "role", "langue", "theme_interface",
                  "email_verifie", "cree_le")
        read_only_fields = ("id", "email_verifie", "cree_le", "role")


class InscriptionSerializer(serializers.ModelSerializer):
    mot_de_passe = serializers.CharField(write_only=True, validators=[validate_password])
    nom_affiche = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Utilisateur
        fields = ("email", "pseudo", "mot_de_passe", "nom_affiche")

    def create(self, validated_data):
        nom_affiche = validated_data.pop("nom_affiche", None)
        mot_de_passe = validated_data.pop("mot_de_passe")
        user = Utilisateur.objects.create_user(
            email=validated_data["email"],
            pseudo=validated_data["pseudo"],
            mot_de_passe=mot_de_passe,
        )
        if nom_affiche:
            user.profil.nom_affiche = nom_affiche
            user.profil.save(update_fields=["nom_affiche"])
        return user


class ProfilSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="utilisateur.id", read_only=True)
    pseudo = serializers.CharField(source="utilisateur.pseudo", read_only=True)
    role = serializers.CharField(source="utilisateur.role", read_only=True)
    initiales = serializers.CharField(read_only=True)
    est_suivi = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    couverture = serializers.SerializerMethodField()

    class Meta:
        model = Profil
        fields = (
            "id", "pseudo", "role", "nom_affiche", "initiales", "bio",
            "avatar_url", "avatar",
            "couverture_url", "couverture",
            "sous_titre", "eglise",
            "ville", "pays", "site_web", "visibilite",
            "nb_abonnes", "nb_abonnements", "nb_videos", "nb_amen_recus",
            "est_suivi",
        )

    def get_est_suivi(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return Abonnement.objects.filter(
            suiveur=request.user, suivi=obj.utilisateur
        ).exists()

    def _url(self, obj, field):
        f = getattr(obj, field, None)
        if not f:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(f.url)
        return f.url

    def get_avatar(self, obj):
        return self._url(obj, "avatar")

    def get_couverture(self, obj):
        return self._url(obj, "couverture")


class EgliseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Eglise
        fields = "__all__"
        read_only_fields = ("proprietaire", "verifiee")


class AbonnementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Abonnement
        fields = ("suiveur", "suivi", "notifications_actives", "cree_le")
        read_only_fields = ("suiveur", "cree_le")