from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Profil, Utilisateur


@receiver(post_save, sender=Utilisateur)
def creer_profil(sender, instance, created, **kwargs):
    if created:
        Profil.objects.get_or_create(
            utilisateur=instance,
            defaults={"nom_affiche": instance.pseudo},
        )
