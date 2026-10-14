from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone

from apps.common.models import BaseModel, UUIDModel


class RoleUtilisateur(models.TextChoices):
    MEMBRE = "membre"
    PASTEUR = "pasteur"
    CHAINE_EGLISE = "chaine_eglise"
    MODERATEUR = "moderateur"
    ADMIN = "admin"


class StatutCompte(models.TextChoices):
    ACTIF = "actif"
    SUSPENDU = "suspendu"
    SUPPRIME = "supprime"


class ThemeInterface(models.TextChoices):
    AUTO = "auto"
    CLAIR = "clair"
    SOMBRE = "sombre"


class UtilisateurManager(BaseUserManager):
    def create_user(self, email, pseudo, mot_de_passe=None, **extra):
        if not email:
            raise ValueError("Email obligatoire")
        email = self.normalize_email(email)
        user = self.model(email=email, pseudo=pseudo, **extra)
        user.set_password(mot_de_passe)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, pseudo, mot_de_passe=None, **extra):
        extra.setdefault("role", RoleUtilisateur.ADMIN)
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        return self.create_user(email, pseudo, mot_de_passe, **extra)


class Utilisateur(AbstractBaseUser, PermissionsMixin, UUIDModel):
    email = models.CharField(max_length=255, unique=True, db_collation="und-x-icu")
    pseudo = models.CharField(max_length=40, unique=True, db_collation="und-x-icu")
    telephone = models.CharField(max_length=30, unique=True, null=True, blank=True)
    role = models.CharField(max_length=20, choices=RoleUtilisateur.choices,
                            default=RoleUtilisateur.MEMBRE)
    email_verifie = models.BooleanField(default=False)
    statut = models.CharField(max_length=20, choices=StatutCompte.choices,
                              default=StatutCompte.ACTIF)
    langue = models.CharField(max_length=5, default="fr")
    theme_interface = models.CharField(max_length=10, choices=ThemeInterface.choices,
                                       default=ThemeInterface.AUTO)
    derniere_connexion = models.DateTimeField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    cree_le = models.DateTimeField(default=timezone.now, editable=False)
    modifie_le = models.DateTimeField(auto_now=True)

    objects = UtilisateurManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["pseudo"]

    class Meta:
        db_table = "utilisateurs"

    def __str__(self):
        return self.pseudo


class Visibilite(models.TextChoices):
    PUBLIC = "public"
    ABONNES = "abonnes"
    PRIVE = "prive"


class Eglise(BaseModel):
    nom = models.CharField(max_length=150)
    denomination = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    logo_url = models.URLField(max_length=255, blank=True)
    couverture_url = models.URLField(max_length=255, blank=True)
    adresse = models.CharField(max_length=150, blank=True)
    ville = models.CharField(max_length=150, blank=True)
    pays = models.CharField(max_length=150, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    horaires_cultes = models.TextField(blank=True)
    proprietaire = models.ForeignKey(Utilisateur, on_delete=models.RESTRICT,
                                     related_name="eglises_possedees")
    verifiee = models.BooleanField(default=False)

    class Meta:
        db_table = "eglises"

    def __str__(self):
        return self.nom


class Profil(models.Model):
    utilisateur = models.OneToOneField(Utilisateur, on_delete=models.CASCADE,
                                       primary_key=True, related_name="profil")
    nom_affiche = models.CharField(max_length=100)
    bio = models.TextField(blank=True)
    avatar_url = models.URLField(max_length=255, blank=True)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    couverture_url = models.URLField(max_length=255, blank=True)
    couverture = models.ImageField(upload_to="couvertures/", null=True, blank=True)
    sous_titre = models.CharField(max_length=150, blank=True)
    eglise = models.ForeignKey(Eglise, on_delete=models.SET_NULL, null=True, blank=True,
                               related_name="membres_profils")
    ville = models.CharField(max_length=80, blank=True)
    pays = models.CharField(max_length=80, blank=True)
    site_web = models.URLField(max_length=190, blank=True)
    visibilite = models.CharField(max_length=10, choices=Visibilite.choices,
                                  default=Visibilite.PUBLIC)
    nb_abonnes = models.PositiveIntegerField(default=0)
    nb_abonnements = models.PositiveIntegerField(default=0)
    nb_videos = models.PositiveIntegerField(default=0)
    nb_amen_recus = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "profils"

    def __str__(self):
        return self.nom_affiche

    @property
    def initiales(self):
        parts = (self.nom_affiche or self.utilisateur.pseudo).split()
        return "".join(p[0].upper() for p in parts[:2]) or "?"


class FonctionEglise(models.TextChoices):
    MEMBRE = "membre"
    DIACRE = "diacre"
    RESPONSABLE = "responsable"
    PASTEUR = "pasteur"
    LOUANGE = "louange"
    MEDIA = "media"


class EgliseMembre(models.Model):
    eglise = models.ForeignKey(Eglise, on_delete=models.CASCADE, related_name="membres")
    utilisateur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE)
    fonction = models.CharField(max_length=20, choices=FonctionEglise.choices,
                                default=FonctionEglise.MEMBRE)
    depuis = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "eglise_membres"
        unique_together = ("eglise", "utilisateur")


class Abonnement(models.Model):
    suiveur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE,
                                related_name="abonnements")
    suivi = models.ForeignKey(Utilisateur, on_delete=models.CASCADE,
                              related_name="abonnes")
    notifications_actives = models.BooleanField(default=False)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "abonnements"
        unique_together = ("suiveur", "suivi")
        constraints = [
            models.CheckConstraint(check=~models.Q(suiveur=models.F("suivi")),
                                   name="pas_auto_abonnement"),
        ]