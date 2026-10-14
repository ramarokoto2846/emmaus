from django.db import models

from apps.accounts.models import Eglise, Utilisateur, Visibilite
from apps.common.models import BaseModel, UUIDModel


class FormatVideo(models.TextChoices):
    HORIZONTAL = "horizontal"
    VERTICAL = "vertical"


class TypeVideo(models.TextChoices):
    PREDICATION = "predication"
    TEMOIGNAGE = "temoignage"
    LOUANGE = "louange"
    ENSEIGNEMENT = "enseignement"
    COURT = "court"
    REPLAY_DIRECT = "replay_direct"


class StatutVideo(models.TextChoices):
    BROUILLON = "brouillon"
    TRAITEMENT = "traitement"
    PUBLIE = "publie"
    MASQUE = "masque"
    SUPPRIME = "supprime"


class Serie(BaseModel):
    auteur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name="series")
    titre = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    image_url = models.URLField(max_length=255, blank=True)

    class Meta:
        db_table = "series"


class Theme(models.Model):
    nom = models.CharField(max_length=60, unique=True)
    slug = models.SlugField(max_length=60, unique=True)
    tendance = models.BooleanField(default=False)

    class Meta:
        db_table = "themes"

    def __str__(self):
        return self.nom


class Verset(models.Model):
    livre = models.CharField(max_length=40)
    chapitre = models.PositiveSmallIntegerField()
    verset_debut = models.PositiveSmallIntegerField()
    verset_fin = models.PositiveSmallIntegerField()
    traduction = models.CharField(max_length=20)
    texte = models.TextField()
    actif_sidebar = models.BooleanField(default=False)

    class Meta:
        db_table = "versets"
        unique_together = ("livre", "chapitre", "verset_debut", "verset_fin", "traduction")
        constraints = [
            models.CheckConstraint(check=models.Q(verset_fin__gte=models.F("verset_debut")),
                                   name="verset_fin_gte_debut"),
        ]

    def __str__(self):
        return f"{self.livre} {self.chapitre}:{self.verset_debut}"

    @property
    def reference(self):
        if self.verset_fin == self.verset_debut:
            return f"{self.livre} {self.chapitre}:{self.verset_debut}"
        return f"{self.livre} {self.chapitre}:{self.verset_debut}-{self.verset_fin}"


class Video(BaseModel):
    auteur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name="videos")
    moderation_verifiee = models.BooleanField(default=False)
    eglise = models.ForeignKey(Eglise, on_delete=models.SET_NULL, null=True, blank=True,
                               related_name="videos")
    titre = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    fichier_url = models.URLField(max_length=255, blank=True)
    fichier = models.FileField(upload_to="videos/", null=True, blank=True)
    miniature_url = models.URLField(max_length=255, blank=True)
    miniature = models.ImageField(upload_to="miniatures/", null=True, blank=True)
    taille_originale_octets = models.BigIntegerField(null=True, blank=True)
    taille_compressee_octets = models.BigIntegerField(null=True, blank=True)
    duree_secondes = models.PositiveIntegerField(null=True, blank=True)
    format = models.CharField(max_length=20, choices=FormatVideo.choices,
                              default=FormatVideo.HORIZONTAL)
    type = models.CharField(max_length=20, choices=TypeVideo.choices,
                            default=TypeVideo.PREDICATION)
    serie = models.ForeignKey(Serie, on_delete=models.SET_NULL, null=True, blank=True,
                              related_name="videos")
    numero_episode = models.PositiveSmallIntegerField(null=True, blank=True)
    statut = models.CharField(max_length=20, choices=StatutVideo.choices,
                              default=StatutVideo.BROUILLON)
    visibilite = models.CharField(max_length=10, choices=Visibilite.choices,
                                  default=Visibilite.PUBLIC)
    commentaires_actifs = models.BooleanField(default=True)
    nb_vues = models.PositiveIntegerField(default=0)
    nb_amen = models.PositiveIntegerField(default=0)
    nb_commentaires = models.PositiveIntegerField(default=0)
    nb_partages = models.PositiveIntegerField(default=0)
    publie_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "videos"
        indexes = [
            models.Index(fields=["auteur", "statut", "-publie_le"]),
            models.Index(fields=["eglise"]),
        ]

    def __str__(self):
        return self.titre


class VideoTheme(models.Model):
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name="themes_lies")
    theme = models.ForeignKey(Theme, on_delete=models.CASCADE)

    class Meta:
        db_table = "video_themes"
        unique_together = ("video", "theme")


class VideoVerset(models.Model):
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name="versets_lies")
    verset = models.ForeignKey(Verset, on_delete=models.CASCADE)
    minute_secondes = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        db_table = "video_versets"
        unique_together = ("video", "verset")


class VersetDuJour(models.Model):
    date = models.DateField(primary_key=True)
    verset = models.ForeignKey(Verset, on_delete=models.CASCADE)

    class Meta:
        db_table = "verset_du_jour"


class VueVideo(models.Model):
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name="vues")
    utilisateur = models.ForeignKey(Utilisateur, on_delete=models.SET_NULL,
                                    null=True, blank=True)
    duree_regardee_secondes = models.PositiveIntegerField(default=0)
    position_reprise_secondes = models.PositiveIntegerField(default=0)
    termine = models.BooleanField(default=False)
    vu_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "vues_video"
        # Un utilisateur = une seule vue par vidéo
        unique_together = ("video", "utilisateur")
        indexes = [
            models.Index(fields=["video", "-vu_le"]),
            models.Index(fields=["utilisateur", "-vu_le"]),
        ]
        

