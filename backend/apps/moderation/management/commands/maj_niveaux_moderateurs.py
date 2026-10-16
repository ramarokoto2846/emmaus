from django.core.management.base import BaseCommand

from apps.moderation.services import mettre_a_jour_niveaux_moderateurs


class Command(BaseCommand):
    help = "Met à jour le niveau de tous les modérateurs selon leur activité"

    def handle(self, *args, **options):
        mettre_a_jour_niveaux_moderateurs()
        self.stdout.write(self.style.SUCCESS(
            "✅ Niveaux des modérateurs mis à jour."
        ))