from django.db import models

from apps.accounts.models import Utilisateur
from apps.common.models import BaseModel
from apps.videos.models import Video


class TypeConversation(models.TextChoices):
    PRIVE = "prive"
    GROUPE = "groupe"


class Conversation(BaseModel):
    type = models.CharField(max_length=10, choices=TypeConversation.choices,
                            default=TypeConversation.PRIVE)
    titre = models.CharField(max_length=120, blank=True)

    class Meta:
        db_table = "conversations"


class Message(BaseModel):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    expediteur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE)
    texte = models.TextField(blank=True)
    video = models.ForeignKey(Video, on_delete=models.SET_NULL, null=True, blank=True)
    lu_le = models.DateTimeField(null=True, blank=True)

    # ✅ AJOUT : suppression logique
    supprime = models.BooleanField(default=False)
    supprime_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "messages"
        indexes = [models.Index(fields=["conversation", "-cree_le"])]
        constraints = [
            models.CheckConstraint(
                check=models.Q(texte__isnull=False) | models.Q(video__isnull=False),
                name="message_non_vide",
            ),
        ]


class ConversationMembre(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="membres")
    utilisateur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE)
    dernier_message_lu = models.ForeignKey(Message, on_delete=models.SET_NULL,
                                           null=True, blank=True)

    class Meta:
        db_table = "conversation_membres"
        unique_together = ("conversation", "utilisateur")