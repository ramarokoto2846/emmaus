from rest_framework import serializers
from apps.feed.serializers import AuteurMiniSerializer
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    acteur = AuteurMiniSerializer(source="acteur.profil", read_only=True)

    class Meta:
        model = Notification
        fields = ("id", "acteur", "type", "cible_type", "cible_id",
                  "lu", "cree_le")
        read_only_fields = fields