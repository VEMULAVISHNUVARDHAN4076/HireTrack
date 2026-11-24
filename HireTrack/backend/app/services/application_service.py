from app.errors import ApiError
from app.extensions import db
from app.models import ApplicationStatusHistory
from app.services.notification_service import notify

STATUS_LABELS = {
    "applied": "Applied",
    "under_review": "Under review",
    "shortlisted": "Shortlisted",
    "interview": "Interview stage",
    "offered": "Offered",
    "rejected": "Rejected",
    "withdrawn": "Withdrawn",
}

# Allowed lifecycle transitions. Terminal states have no outgoing transitions.
TRANSITIONS = {
    "applied": {"under_review", "shortlisted", "rejected", "withdrawn"},
    "under_review": {"shortlisted", "interview", "rejected", "withdrawn"},
    "shortlisted": {"interview", "offered", "rejected", "withdrawn"},
    "interview": {"shortlisted", "offered", "rejected", "withdrawn"},
    "offered": set(),
    "rejected": set(),
    "withdrawn": set(),
}


def change_status(application, new_status, actor_user_id, note=None):
    current = application.status
    if new_status not in TRANSITIONS.get(current, set()):
        raise ApiError(
            f"Cannot change status from {STATUS_LABELS[current]} to {STATUS_LABELS.get(new_status, new_status)}.",
            409,
        )
    application.status = new_status
    db.session.add(ApplicationStatusHistory(application_id=application.id, status=new_status, note=note,
                                            changed_by_user_id=actor_user_id))
    notify(
        application.candidate.user_id,
        "Application update",
        f"Your application for {application.job.title} is now: {STATUS_LABELS[new_status]}.",
        f"/applications/{application.id}",
    )
