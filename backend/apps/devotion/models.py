from django.db import models

from apps.accounts.models import Eglise, Utilisateur
from apps.common.models import BaseModel


class VisibilitePriere(models.TextChoices):
    PUBLIC = "public"
    ABONNES = "abonnes"
    EGLISE = "eglise"
    PRIVE = "prive"


class SujetPriere(BaseModel):
    auteur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name="sujets_priere")
    titre = models.CharField(max_length=160)
    details = models.TextField(blank=True)
    visibilite = models.CharField(max_length=10, choices=VisibilitePriere.choices,
                                  default=VisibilitePriere.PUBLIC)
    exauce = models.BooleanField(default=False)
    nb_priants = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "sujets_priere"
        indexes = [models.Index(fields=["auteur", "-cree_le"])]


class Priant(models.Model):
    sujet = models.ForeignKey(SujetPriere, on_delete=models.CASCADE, related_name="priants")
    utilisateur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "priants"
        unique_together = ("sujet", "utilisateur")


class DefiLecture(BaseModel):
    createur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE)
    titre = models.CharField(max_length=150)
    livre = models.CharField(max_length=40, blank=True)
    nb_chapitres = models.PositiveSmallIntegerField()
    date_debut = models.DateField(null=True, blank=True)
    date_fin = models.DateField(null=True, blank=True)
    nb_participants = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "defis_lecture"


class DefiParticipation(models.Model):
    defi = models.ForeignKey(DefiLecture, on_delete=models.CASCADE, related_name="participations")
    utilisateur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE)
    chapitre_actuel = models.PositiveSmallIntegerField(default=0)
    pourcentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    inscrit_le = models.DateTimeField(auto_now_add=True)
    termine_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "defi_participations"
        unique_together = ("defi", "utilisateur")