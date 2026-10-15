from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import Utilisateur
from apps.common.pagination import StandardPagination
from apps.notifications.services import creer_notification
from .models import Conversation, ConversationMembre, Message
from .serializers import ConversationSerializer, MessageSerializer


class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        """Conversations où je suis membre."""
        return (Conversation.objects
                .filter(membres__utilisateur=self.request.user)
                .prefetch_related("membres__utilisateur__profil")
                .distinct())

    @action(detail=False, methods=["post"])
    def demarrer(self, request):
        """Crée (ou récupère) une conversation privée avec un utilisateur."""
        autre_id = request.data.get("utilisateur_id")
        if not autre_id:
            return Response({"detail": "utilisateur_id requis."}, status=400)
        if str(autre_id) == str(request.user.id):
            return Response({"detail": "Impossible de se parler à soi-même."}, status=400)

        conversation = (Conversation.objects
                        .filter(type="prive",
                                membres__utilisateur=request.user)
                        .filter(membres__utilisateur_id=autre_id)
                        .first())
        if not conversation:
            conversation = Conversation.objects.create(type="prive")
            ConversationMembre.objects.bulk_create([
                ConversationMembre(conversation=conversation, utilisateur=request.user),
                ConversationMembre(conversation=conversation, utilisateur_id=autre_id),
            ])
        return Response(ConversationSerializer(conversation, context={"request": request}).data)

    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        conv = self.get_object()
        if request.method == "POST":
            s = MessageSerializer(data=request.data)
            s.is_valid(raise_exception=True)
            msg = s.save(conversation=conv, expediteur=request.user)
            ConversationMembre.objects.filter(
                conversation=conv, utilisateur=request.user
            ).update(dernier_message_lu=msg)

            autres = ConversationMembre.objects.filter(
                conversation=conv
            ).exclude(utilisateur=request.user).select_related("utilisateur")

            for m in autres:
                creer_notification(
                    destinataire=m.utilisateur,
                    acteur=request.user,
                    type="message",
                    cible_type="message",
                    cible_id=msg.id,
                )

            return Response(MessageSerializer(msg).data, status=201)

        # GET : marquer comme lus
        msgs = conv.messages.select_related("expediteur__profil").order_by("-cree_le")[:50]
        ids = [m.id for m in msgs if m.expediteur != request.user and not m.lu_le]
        if ids:
            Message.objects.filter(id__in=ids).update(lu_le=timezone.now())
        return Response(MessageSerializer(msgs, many=True).data)


class MessageViewSet(viewsets.GenericViewSet):
    """Actions sur un message individuel : suppression."""
    permission_classes = [IsAuthenticated]
    queryset = Message.objects.all()

    @action(detail=True, methods=["delete"])
    def supprimer(self, request, pk=None):
        msg = self.get_object()
        if msg.expediteur != request.user:
            return Response(
                {"detail": "Vous ne pouvez supprimer que vos propres messages."},
                status=403,
            )

        # ✅ Suppression logique (on garde la ligne pour le placeholder)
        msg.supprime = True
        msg.supprime_le = timezone.now()
        msg.save(update_fields=["supprime", "supprime_le"])

        # ✅ PLUS DE NOTIFICATION "message_supprime"
        # (L'utilisateur verra le placeholder directement dans la conversation)

        return Response(status=status.HTTP_204_NO_CONTENT)