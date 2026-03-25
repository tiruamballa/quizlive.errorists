"""WebSocket URL routing for quiz_sessions app."""
from django.urls import re_path
from .consumers import GameConsumer

websocket_urlpatterns = [
    re_path(r"^ws/game/(?P<game_code>[A-Z0-9]{6})/$", GameConsumer.as_asgi()),
]
