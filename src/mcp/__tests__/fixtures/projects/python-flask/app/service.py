"""User service layer."""

from .models.user import User, validate_email


_users: dict[str, User] = {}
_counter = 0


def create_user(name: str, email: str) -> User:
    """Create a new user after validating email."""
    global _counter
    if not validate_email(email):
        raise ValueError(f"Invalid email: {email}")
    _counter += 1
    user = User(user_id=f"user-{_counter}", name=name, email=email)
    _users[user.user_id] = user
    return user


def get_user(user_id: str) -> User | None:
    """Get a user by ID."""
    return _users.get(user_id)


def list_users() -> list[User]:
    """List all users."""
    return list(_users.values())
