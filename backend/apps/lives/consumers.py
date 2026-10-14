import json
from channels.generic.websocket import AsyncWebsocketConsumer


class DirectChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.direct_id = self.scope["url_route"]["kwargs"]["direct_id"]
        self.groupe = f"direct_{self.direct_id}"
        await self.channel_layer.group_add(self.groupe, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.groupe, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        await self.channel_layer.group_send(
            self.groupe,
            {"type": "chat.message", "texte": data.get("texte", "")},
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({"texte": event["texte"]}))