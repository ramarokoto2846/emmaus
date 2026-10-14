from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Notification


def creer_notification(destinataire, acteur, type, cible_type="", cible_id=None):
    """Crée une notification et la pousse via WebSocket."""
    if acteur == destinataire:
        return None

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
        # WebSocket optionnel — pas de Redis en dev ? On ignore
        pass

    return notif
