"""
JWT authentication middleware for Django Channels WebSocket connections.
Validates the JWT token passed in ?token= query string.
"""
import logging
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

logger = logging.getLogger(__name__)


@database_sync_to_async
def get_user_from_token(token_key: str):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    try:
        token   = AccessToken(token_key)
        user_id = token.get("user_id")
        if not user_id:
            logger.warning("WS JWT: token has no user_id claim")
            return AnonymousUser()
        user = User.objects.get(id=user_id)
        logger.info("WS JWT: authenticated user=%s id=%s role=%s",
                    user.username, user.id, user.role)
        return user
    except (TokenError, InvalidToken) as exc:
        logger.warning("WS JWT: token invalid — %s", exc)
        return AnonymousUser()
    except User.DoesNotExist:
        logger.warning("WS JWT: user_id=%s not found in DB", user_id)
        return AnonymousUser()
    except Exception as exc:
        logger.error("WS JWT: unexpected error — %s", exc, exc_info=True)
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        params       = parse_qs(query_string)
        token_list   = params.get("token", [])

        if token_list and token_list[0]:
            scope["user"] = await get_user_from_token(token_list[0])
        else:
            logger.warning("WS: no token in query string for path=%s",
                           scope.get("path", "?"))
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)
