import json
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
        self.groupe = f"conv_{self.conversation_id}"
        user = self.scope.get("user")
        if not user or user.is_anonymous:
            await self.close()
            return
        if not await self.est_membre(user.id):
            await self.close()
            return
        await self.channel_layer.group_add(self.groupe, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.groupe, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        texte = data.get("texte", "").strip()
        if not texte:
            return
        user = self.scope["user"]
        msg = await self.enregistrer_message(user.id, texte)
        await self.channel_layer.group_send(self.groupe, {
            "type": "chat.message",
            "message": msg,
        })

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    @database_sync_to_async
    def est_membre(self, user_id):
        from .models import ConversationMembre
        return ConversationMembre.objects.filter(
            conversation_id=self.conversation_id, utilisateur_id=user_id
        ).exists()

    @database_sync_to_async
    def enregistrer_message(self, user_id, texte):
        from .models import ConversationMembre, Message
        msg = Message.objects.create(
            conversation_id=self.conversation_id,
            expediteur_id=user_id,
            texte=texte,
        )
        ConversationMembre.objects.filter(
            conversation_id=self.conversation_id, utilisateur_id=user_id
        ).update(dernier_message_lu=msg)
        return {
            "id": str(msg.id),
            "texte": msg.texte,
            "cree_le": msg.cree_le.isoformat(),
        }