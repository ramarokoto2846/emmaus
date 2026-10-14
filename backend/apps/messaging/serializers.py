from rest_framework import serializers
from apps.feed.serializers import AuteurMiniSerializer
from .models import Conversation, ConversationMembre, Message


class MessageSerializer(serializers.ModelSerializer):
    expediteur = AuteurMiniSerializer(source="expediteur.profil", read_only=True)

    class Meta:
        model = Message
        fields = ("id", "expediteur", "texte", "video", "lu_le", "cree_le")
        read_only_fields = ("expediteur", "lu_le", "cree_le")


class ConversationSerializer(serializers.ModelSerializer):
    membres = AuteurMiniSerializer(
        source="membres.utilisateur.profil", many=True, read_only=True
    )
    dernier_message = serializers.SerializerMethodField()
    non_lus = serializers.SerializerMethodField()
    interlocuteur = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = (
            "id", "type", "titre", "membres", "interlocuteur",
            "dernier_message", "non_lus", "cree_le",
        )

    def get_dernier_message(self, obj):
        m = obj.messages.order_by("-cree_le").first()
        return MessageSerializer(m, context=self.context).data if m else None

    def get_non_lus(self, obj):
        r = self.context.get("request")
        if not r or not r.user.is_authenticated:
            return 0
        membre = obj.membres.filter(utilisateur=r.user).first()
        qs = obj.messages.exclude(expediteur=r.user).filter(lu_le__isnull=True)
        if membre and membre.dernier_message_lu:
            qs = qs.filter(cree_le__gt=membre.dernier_message_lu.cree_le)
        return qs.count()

    def get_interlocuteur(self, obj):
        """Pour les conversations privées : renvoie l'autre membre."""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        autre = (
            obj.membres.exclude(utilisateur=request.user)
            .select_related("utilisateur__profil")
            .first()
        )
        if not autre:
            return None
        p = autre.utilisateur.profil
        avatar_url = None
        if p.avatar:
            avatar_url = request.build_absolute_uri(p.avatar.url)
        return {
            "id": str(p.utilisateur_id),
            "pseudo": p.utilisateur.pseudo,
            "nom_affiche": p.nom_affiche,
            "initiales": p.initiales,
            "avatar": avatar_url,
            "sous_titre": p.sous_titre,
        }
