from django.db import models

from apps.accounts.models import Utilisateur
from apps.common.models import UUIDModel


class TypeNotification(models.TextChoices):
    AMEN = "amen"
    COMMENTAIRE = "commentaire"
    ABONNE = "abonne"
    DIRECT = "direct"
    PRIERE = "priere"
    DEFI = "defi"
    MESSAGE = "message"
    VERSET = "verset"
    MESSAGE_SUPPRIME = "message_supprime"
    SIGNALEMENT = "signalement"
    SIGNALEMENT_LEVE = "signalement_leve"
    SIGNALEMENT_CONFIRME = "signalement_confirme"
    PROMOTION_MODERATEUR = "promotion_moderateur"
    RETROGRADATION = "retrogradation"
    SUPPRESSION_CONTENU = "suppression_contenu"
    PARTAGE = "partage"
    MENTION = "mention"
    REPONSE = "reponse"                   


class Notification(UUIDModel):
    destinataire = models.ForeignKey(
        Utilisateur, on_delete=models.CASCADE, related_name="notifications"
    )
    acteur = models.ForeignKey(
        Utilisateur, on_delete=models.SET_NULL, null=True, blank=True
    )
    type = models.CharField(max_length=20, choices=TypeNotification.choices)
    cible_type = models.CharField(max_length=20, blank=True)
    cible_id = models.UUIDField(null=True, blank=True)
    lu = models.BooleanField(default=False)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        indexes = [models.Index(fields=["destinataire", "lu", "-cree_le"])]

    def __str__(self):
        return f"{self.acteur} → {self.destinataire} ({self.type})"