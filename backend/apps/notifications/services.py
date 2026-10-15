import re
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from django.db.models import Q

from .models import Notification

User = get_user_model()

MENTION_REGEX = re.compile(
    r"@([\w\u00C0-\u017F][\w\u00C0-\u017F.\-]*)",
    re.UNICODE,
)


def creer_notification(destinataire, acteur, type, cible_type="", cible_id=None):
    """Crée une notification et la pousse via WebSocket."""
    if acteur == destinataire:
        return None

    # Anti-doublon (même non lue, même cible, même type)
    doublon = Notification.objects.filter(
        destinataire=destinataire,
        acteur=acteur,
        type=type,
        cible_type=cible_type,
        cible_id=cible_id,
        lu=False,
    ).first()
    if doublon:
        return doublon

    notif = Notification.objects.create(
        destinataire=destinataire,
        acteur=acteur,
        type=type,
        cible_type=cible_type,
        cible_id=cible_id,
    )

    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"notif_{destinataire.id}",
            {
                "type": "notif.message",
                "data": {
                    "id": str(notif.id),
                    "type": notif.type,
                    "acteur": acteur.pseudo if acteur else None,
                    "cree_le": notif.cree_le.isoformat(),
                },
            },
        )
    except Exception:
        pass

    return notif


def extraire_mentions(texte: str) -> list[str]:
    """Retourne la liste unique des pseudos mentionnés via @pseudo."""
    if not texte:
        return []
    return list({m.group(1) for m in MENTION_REGEX.finditer(texte)})


# ============================================================
# ✅ AJOUT : notification "X a répondu à votre commentaire"
# ============================================================
def notifier_reponse_commentaire(commentaire, auteur):
    """
    Notifie l'auteur du commentaire PARENT quand on lui répond.

    Règles :
    - Peu importe la profondeur (parent = commentaire mère OU réponse)
    - On ne se notifie pas soi-même
    - Anti-doublon avec une éventuelle notification "mention" déjà créée
    """
    parent = commentaire.parent
    if not parent:
        return None

    destinataire = parent.auteur
    if destinataire == auteur:
        return None

    # Anti-doublon : si une mention a déjà été créée pour ce destinataire
    # sur le même commentaire, on ne crée pas de doublon.
    deja = Notification.objects.filter(
        destinataire=destinataire,
        acteur=auteur,
        cible_type="commentaire",
        cible_id=commentaire.id,
        type__in=["mention", "reponse"],
        lu=False,
    ).exists()
    if deja:
        return None

    return creer_notification(
        destinataire=destinataire,
        acteur=auteur,
        type="reponse",
        cible_type="commentaire",
        cible_id=commentaire.id,
    )


def notifier_mentions(contenu, auteur):
    """
    Crée une notification pour chaque utilisateur mentionné via @pseudo.
    `contenu` peut être un Commentaire OU une Publication.
    """
    texte = getattr(contenu, "texte", "") or ""
    pseudos = extraire_mentions(texte)
    if not pseudos:
        return []

    # Insensible à la casse
    q = Q()
    for p in pseudos:
        q |= Q(pseudo__iexact=p)

    destinataires = User.objects.filter(q).exclude(id=auteur.id)

    nom_modele = contenu.__class__.__name__
    if nom_modele == "Commentaire":
        cible_type = "commentaire"
        cible_id = contenu.id
    elif nom_modele == "Publication":
        cible_type = "publication"
        cible_id = contenu.id
    else:
        return []

    notifications = []
    for destinataire in destinataires:
        notif = creer_notification(
            destinataire=destinataire,
            acteur=auteur,
            type="mention",
            cible_type=cible_type,
            cible_id=cible_id,
        )
        if notif:
            notifications.append(notif)

    return notifications