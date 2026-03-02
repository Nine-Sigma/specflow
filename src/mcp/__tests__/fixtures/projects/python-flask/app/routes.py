"""Flask route handlers."""

from .service import create_user, get_user, list_users


def handle_create_user(data: dict) -> dict:
    """Handle POST /users."""
    user = create_user(data["name"], data["email"])
    return user.to_dict()


def handle_get_user(user_id: str) -> dict | None:
    """Handle GET /users/<id>."""
    user = get_user(user_id)
    if user is None:
        return None
    return user.to_dict()


def handle_list_users() -> list[dict]:
    """Handle GET /users."""
    return [u.to_dict() for u in list_users()]
