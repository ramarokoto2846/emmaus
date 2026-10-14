from rest_framework import serializers
from .models import Direct, DirectMessage


class DirectMessageSerializer(serializers.ModelSerializer):
    auteur_pseudo = serializers.CharField(source="auteur.pseudo", read_only=True)
    auteur_initiales = serializers.CharField(source="auteur.profil.initiales", read_only=True)

    class Meta:
        model = DirectMessage
        fields = ("id", "auteur_pseudo", "auteur_initiales", "texte",
                  "epingle", "cree_le")
        read_only_fields = ("cree_le",)


class DirectSerializer(serializers.ModelSerializer):
    hote_nom = serializers.CharField(source="hote.profil.nom_affiche", read_only=True)

    class Meta:
        model = Direct
        fields = ("id", "hote_nom", "titre", "description", "miniature_url",
                  "flux_url", "statut", "debut_prevu", "debut_reel", "fin_reelle",
                  "pic_spectateurs", "nb_spectateurs_actuels", "replay_video",
                  "cree_le")