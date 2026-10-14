from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path("ws/directs/<uuid:direct_id>/", consumers.DirectChatConsumer.as_asgi()),
]