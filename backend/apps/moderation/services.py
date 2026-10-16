from apps.accounts.models import Utilisateur


def calculer_niveau_moderateur(utilisateur):
    """
    Calcule le niveau d'un modérateur selon son activité.

    - Niveau 1 (Argent)     : 0 à 99 signalements traités
    - Niveau 2 (Or)         : 100 à 9 999 signalements traités
    - Niveau 3 (Or royal)   : 10 000+ signalements traités
    """
    if utilisateur.role != "moderateur":
        return 1

    nb = getattr(utilisateur, "nb_signalements_traites", 0) or 0

    if nb >= 10000:
        return 3
    if nb >= 100:
        return 2
    return 1


def mettre_a_jour_niveaux_moderateurs():
    """
    Parcourt tous les modérateurs et met à jour leur niveau.
    """
    for u in Utilisateur.objects.filter(role="moderateur"):
        nouveau = calculer_niveau_moderateur(u)
        if u.niveau_moderateur != nouveau:
            u.niveau_moderateur = nouveau
            u.save(update_fields=["niveau_moderateur"])


def incrementer_signalements_traites(moderateur):
    """
    Incrémente le compteur et met à jour le niveau.
    À appeler après chaque signalement traité.
    """
    if moderateur.role != "moderateur":
        return

    moderateur.nb_signalements_traites = (
        moderateur.nb_signalements_traites or 0
    ) + 1
    moderateur.niveau_moderateur = calculer_niveau_moderateur(moderateur)
    moderateur.save(update_fields=[
        "nb_signalements_traites",
        "niveau_moderateur",
    ])