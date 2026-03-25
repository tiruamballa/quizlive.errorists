"""ASGI config. File goes to: config/asgi.py"""
import os
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django_asgi_app = get_asgi_application()

from apps.quiz_sessions.routing import websocket_urlpatterns  # ← FIXED (was apps.sessions)
from apps.quiz_sessions.middleware import JWTAuthMiddleware    # ← FIXED (was apps.sessions)

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        JWTAuthMiddleware(URLRouter(websocket_urlpatterns))
    ),
})
