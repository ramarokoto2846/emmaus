from django.db import models

from apps.accounts.models import Eglise, Utilisateur
from apps.common.models import BaseModel
from apps.videos.models import Video


class StatutDirect(models.TextChoices):
    PROGRAMME = "programme"
    EN_COURS = "en_cours"
    TERMINE = "termine"
    ANNULE = "annule"


class Direct(BaseModel):
    hote = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name="directs")
    eglise = models.ForeignKey(Eglise, on_delete=models.SET_NULL, null=True, blank=True)
    titre = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    miniature_url = models.URLField(max_length=255, blank=True)
    flux_url = models.URLField(max_length=255, blank=True)
    cle_diffusion = models.CharField(max_length=255, blank=True)
    statut = models.CharField(max_length=20, choices=StatutDirect.choices,
                              default=StatutDirect.PROGRAMME)
    debut_prevu = models.DateTimeField(null=True, blank=True)
    debut_reel = models.DateTimeField(null=True, blank=True)
    fin_reelle = models.DateTimeField(null=True, blank=True)
    pic_spectateurs = models.PositiveIntegerField(default=0)
    nb_spectateurs_actuels = models.PositiveIntegerField(default=0)
    replay_video = models.ForeignKey(Video, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = "directs"
        indexes = [models.Index(fields=["statut", "debut_prevu"])]


class DirectMessage(models.Model):
    direct = models.ForeignKey(Direct, on_delete=models.CASCADE, related_name="messages")
    auteur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE)
    texte = models.TextField()
    epingle = models.BooleanField(default=False)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "direct_messages"
        indexes = [models.Index(fields=["direct", "-cree_le"])]


class DirectRappel(models.Model):
    direct = models.ForeignKey(Direct, on_delete=models.CASCADE)
    utilisateur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "direct_rappels"
        unique_together = ("direct", "utilisateur")