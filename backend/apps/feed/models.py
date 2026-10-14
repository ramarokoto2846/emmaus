from django.db import models

from apps.accounts.models import Utilisateur, Visibilite
from apps.common.models import BaseModel
from apps.videos.models import Verset, Video


class TypePublication(models.TextChoices):
    VIDEO = "video"
    TEXTE = "texte"
    PARTAGE = "partage"
    ANNONCE = "annonce"


class TypeCible(models.TextChoices):
    PUBLICATION = "publication"
    VIDEO = "video"
    COMMENTAIRE = "commentaire"
    PROFIL = "profil"
    DIRECT = "direct"
    SUJET_PRIERE = "sujet_priere"
    MESSAGE = "message"


class StatutCommentaire(models.TextChoices):
    VISIBLE = "visible"
    MASQUE = "masque"
    SUPPRIME = "supprime"


class CanalPartage(models.TextChoices):
    INTERNE = "interne"
    LIEN = "lien"
    WHATSAPP = "whatsapp"
    FACEBOOK = "facebook"


class Publication(BaseModel):
    auteur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name="publications")
    texte = models.TextField(blank=True)
    video = models.ForeignKey(Video, on_delete=models.SET_NULL, null=True, blank=True)
    verset = models.ForeignKey(Verset, on_delete=models.SET_NULL, null=True, blank=True)
    type = models.CharField(max_length=20, choices=TypePublication.choices,
                            default=TypePublication.VIDEO)
    publication_origine = models.ForeignKey("self", on_delete=models.SET_NULL,
                                            null=True, blank=True, related_name="repartages")
    visibilite = models.CharField(max_length=10, choices=Visibilite.choices,
                                  default=Visibilite.PUBLIC)
    epinglee = models.BooleanField(default=False)
    nb_amen = models.PositiveIntegerField(default=0)
    nb_commentaires = models.PositiveIntegerField(default=0)
    nb_partages = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "publications"
        indexes = [
            models.Index(fields=["auteur", "-cree_le"]),
            models.Index(fields=["-cree_le"]),
        ]


class Amen(models.Model):
    utilisateur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE)
    cible_type = models.CharField(max_length=20, choices=TypeCible.choices)
    cible_id = models.UUIDField()
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "amens"
        unique_together = ("utilisateur", "cible_type", "cible_id")
        indexes = [models.Index(fields=["cible_type", "cible_id"])]


class Commentaire(BaseModel):
    auteur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE)
    cible_type = models.CharField(max_length=20, choices=TypeCible.choices)
    cible_id = models.UUIDField()
    parent = models.ForeignKey("self", on_delete=models.CASCADE, null=True, blank=True,
                               related_name="reponses")
    texte = models.TextField()
    nb_amen = models.PositiveIntegerField(default=0)
    statut = models.CharField(max_length=20, choices=StatutCommentaire.choices,
                              default=StatutCommentaire.VISIBLE)

    class Meta:
        db_table = "commentaires"
        indexes = [models.Index(fields=["cible_type", "cible_id", "-cree_le"])]


class Enregistrement(models.Model):
    utilisateur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE)
    cible_type = models.CharField(max_length=20, choices=TypeCible.choices)
    cible_id = models.UUIDField()
    collection = models.CharField(max_length=60, blank=True)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "enregistrements"
        unique_together = ("utilisateur", "cible_type", "cible_id")


class Partage(models.Model):
    utilisateur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE)
    cible_type = models.CharField(max_length=20, choices=TypeCible.choices)
    cible_id = models.UUIDField()
    canal = models.CharField(max_length=20, choices=CanalPartage.choices,
                             default=CanalPartage.INTERNE)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "partages"
        indexes = [models.Index(fields=["cible_type", "cible_id"])]