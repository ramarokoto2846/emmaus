from django.db import models

from apps.accounts.models import Utilisateur
from apps.common.models import UUIDModel


class MotifSignalement(models.TextChoices):
    NON_EVANGELIQUE = "non_evangelique"      # Contenu contraire à la foi
    HARCELEMENT = "harcelement"              # Harcèlement / intimidation
    CONTENU_SEXUEL = "contenu_sexuel"        # Contenu sexuel / impudique
    Haine = "haine"                          # Discours de haine
    SPAM = "spam"                            # Spam / publicité
    FAUSSE_INFO = "fausse_info"              # Fausse doctrine / fausses infos
    DROITS_AUTEUR = "droits_auteur"          # Droits d'auteur
    AUTRE = "autre"                          # Autre motif


class StatutSignalement(models.TextChoices):
    OUVERT = "ouvert"
    TRAITE = "traite"
    REJETE = "rejete"


class Signalement(UUIDModel):
    auteur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE)
    cible_type = models.CharField(max_length=20)
    cible_id = models.UUIDField()
    motif = models.CharField(max_length=30, choices=MotifSignalement.choices)
    details = models.TextField(blank=True)
    statut = models.CharField(max_length=20, choices=StatutSignalement.choices,
                              default=StatutSignalement.OUVERT)
    traite_par = models.ForeignKey(Utilisateur, on_delete=models.SET_NULL,
                                   null=True, blank=True, related_name="signalements_traites")
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "signalements"
        indexes = [models.Index(fields=["statut", "-cree_le"])]


class Blocage(models.Model):
    utilisateur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name="blocages")
    bloque = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name="bloque_par")
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "blocages"
        unique_together = ("utilisateur", "bloque")


class RechercheRecente(models.Model):
    utilisateur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE)
    terme = models.CharField(max_length=150)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "recherches_recentes"
        indexes = [models.Index(fields=["utilisateur", "-cree_le"])]