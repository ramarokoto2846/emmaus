from rest_framework import serializers
from apps.feed.serializers import AuteurMiniSerializer
from .models import DefiLecture, DefiParticipation, SujetPriere


class SujetPriereSerializer(serializers.ModelSerializer):
    auteur = AuteurMiniSerializer(read_only=True)
    est_priant = serializers.SerializerMethodField()

    class Meta:
        model = SujetPriere
        fields = ("id", "auteur", "titre", "details", "visibilite",
                  "exauce", "nb_priants", "cree_le", "est_priant")
        read_only_fields = ("auteur", "nb_priants", "cree_le")

    def get_est_priant(self, obj):
        r = self.context.get("request")
        if not r or not r.user.is_authenticated:
            return False
        return obj.priants.filter(utilisateur=r.user).exists()


class DefiLectureSerializer(serializers.ModelSerializer):
    createur = AuteurMiniSerializer(read_only=True)

    class Meta:
        model = DefiLecture
        fields = ("id", "createur", "titre", "livre", "nb_chapitres",
                  "date_debut", "date_fin", "nb_participants", "cree_le")


class DefiParticipationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DefiParticipation
        fields = ("defi", "chapitre_actuel", "pourcentage",
                  "inscrit_le", "termine_le")