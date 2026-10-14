from rest_framework import serializers
from .models import Blocage, RechercheRecente, Signalement


class SignalementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Signalement
        fields = ("id", "cible_type", "cible_id", "motif", "details",
                  "statut", "cree_le")
        read_only_fields = ("statut", "cree_le")


class BlocageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Blocage
        fields = ("id", "bloque", "cree_le")
        read_only_fields = ("cree_le",)


class RechercheRecenteSerializer(serializers.ModelSerializer):
    class Meta:
        model = RechercheRecente
        fields = ("id", "terme", "cree_le")
