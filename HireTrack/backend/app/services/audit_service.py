from app.extensions import db
from app.models import AuditLog


def record_audit(actor_user_id, action, target_type, target_id=None, details=None):
    db.session.add(AuditLog(actor_user_id=actor_user_id, action=action, target_type=target_type,
                            target_id=target_id, details=details))
