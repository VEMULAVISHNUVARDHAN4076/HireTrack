from flask import Blueprint, g, request

from app.errors import ApiError
from app.extensions import db
from app.models import Notification
from app.utils.auth import roles_required
from app.utils.helpers import ok, paged_response

bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")


@bp.get("")
@roles_required()
def list_notifications():
    query = Notification.query.filter_by(user_id=g.current_user.id)
    if request.args.get("unread") == "true":
        query = query.filter(Notification.is_read.is_(False))
    query = query.order_by(Notification.created_at.desc(), Notification.id.desc())
    response, status = paged_response(query, lambda n: n.to_dict())
    unread = Notification.query.filter_by(user_id=g.current_user.id, is_read=False).count()
    response["unread_count"] = unread
    return response, status


@bp.post("/<int:notification_id>/read")
@roles_required()
def mark_read(notification_id):
    notification = db.session.get(Notification, notification_id)
    if notification is None or notification.user_id != g.current_user.id:
        raise ApiError("Notification not found.", 404)
    notification.is_read = True
    db.session.commit()
    return ok(notification.to_dict())


@bp.post("/read-all")
@roles_required()
def mark_all_read():
    Notification.query.filter_by(user_id=g.current_user.id, is_read=False).update({"is_read": True})
    db.session.commit()
    return ok({"message": "All notifications marked as read."})
