from django.db import migrations
from django.utils import timezone


THEMES = [
    ("Foi en famille", "foi-en-famille", True),
    ("Guérison", "guerison", True),
    ("Jeûne et prière", "jeune-et-priere", True),
    ("Jeunesse", "jeunesse", True),
    ("Louange", "louange", False),
    ("Témoignage", "temoignage", False),
]

VERSETS = [
    ("Luc", 24, 32, 32, "LSG",
     "Et ils se dirent l'un à l'autre : Notre cœur ne brûlait-il pas au dedans de nous, "
     "lorsqu'il nous parlait en chemin et nous expliquait les Écritures ?"),
    ("Psaumes", 119, 105, 105, "LSG",
     "Ta parole est une lampe à mes pieds, et une lumière sur mon sentier."),
]


def seed(apps, schema_editor):
    Theme = apps.get_model("videos", "Theme")
    Verset = apps.get_model("videos", "Verset")
    VersetDuJour = apps.get_model("videos", "VersetDuJour")

    for nom, slug, tendance in THEMES:
        Theme.objects.get_or_create(slug=slug, defaults={"nom": nom, "tendance": tendance})

    for livre, chap, vd, vf, trad, texte in VERSETS:
        Verset.objects.get_or_create(
            livre=livre, chapitre=chap, verset_debut=vd, verset_fin=vf,
            traduction=trad, defaults={"texte": texte},
        )

    verset = Verset.objects.filter(livre="Luc", chapitre=24, verset_debut=32).first()
    if verset:
        VersetDuJour.objects.get_or_create(
            date=timezone.now().date(), defaults={"verset": verset}
        )


def unseed(apps, schema_editor):
    Theme = apps.get_model("videos", "Theme")
    Verset = apps.get_model("videos", "Verset")
    Theme.objects.filter(slug__in=[s for _, s, _ in THEMES]).delete()
    Verset.objects.filter(livre__in=["Luc", "Psaumes"]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("videos", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
