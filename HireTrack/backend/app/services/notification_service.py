from app.extensions import db
from app.models import Notification


def notify(user_id, title, message, link=None):
    """Queue a notification in the current session. The caller commits."""
    db.session.add(Notification(user_id=user_id, title=title[:120], message=message[:500], link=link))
