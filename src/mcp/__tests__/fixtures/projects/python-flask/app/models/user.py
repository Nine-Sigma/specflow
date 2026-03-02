"""User model for the Flask app."""


class User:
    """Represents a user in the system."""

    def __init__(self, user_id: str, name: str, email: str):
        self.user_id = user_id
        self.name = name
        self.email = email

    def to_dict(self) -> dict:
        """Convert user to dictionary."""
        return {
            "id": self.user_id,
            "name": self.name,
            "email": self.email,
        }


def validate_email(email: str) -> bool:
    """Validate an email address."""
    return "@" in email and "." in email
