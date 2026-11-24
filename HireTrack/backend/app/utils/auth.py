from functools import wraps

from flask import g
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app.errors import ApiError
from app.extensions import db
from app.models import User


def _load_user(identity):
    return db.session.get(User, int(identity)) if identity is not None else None


def roles_required(*roles):
    """Require a valid JWT and, optionally, one of the given roles. Sets g.current_user."""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user = _load_user(get_jwt_identity())
            if user is None or not user.is_active:
                raise ApiError("This account is unavailable.", 403)
            if roles and user.role not in roles:
                raise ApiError("You do not have permission to perform this action.", 403)
            g.current_user = user
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def optional_user():
    """Return the logged-in user if a valid token is present, otherwise None."""
    verify_jwt_in_request(optional=True)
    return _load_user(get_jwt_identity())
