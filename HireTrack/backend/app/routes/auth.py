from flask import Blueprint, g
from flask_jwt_extended import create_access_token
from sqlalchemy.exc import IntegrityError

from app.errors import ApiError
from app.extensions import bcrypt, db, limiter
from app.models import CandidateProfile, RecruiterProfile, User, utcnow
from app.utils.auth import roles_required
from app.utils.helpers import clean_str, get_json, ok, validate_email, validate_password

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _token_response(user, status=200):
    token = create_access_token(identity=str(user.id))
    return ok({"access_token": token, "user": user.to_dict()}, status)


@bp.post("/register")
@limiter.limit("10 per hour")
def register():
    data = get_json()
    role = data.get("role")
    if role not in ("candidate", "recruiter"):
        raise ApiError("Role must be 'candidate' or 'recruiter'. Administrators cannot self-register.", 400,
                       {"field": "role"})
    email = validate_email(data.get("email"))
    password = validate_password(data.get("password"))
    full_name = clean_str(data, "full_name", 2, 120)

    if User.query.filter_by(email=email).first():
        raise ApiError("An account with this email already exists.", 409)

    user = User(
        email=email,
        full_name=full_name,
        role=role,
        password_hash=bcrypt.generate_password_hash(password).decode("utf-8"),
        is_verified=(role == "candidate"),  # recruiters are verified by an administrator
    )
    if role == "candidate":
        user.candidate_profile = CandidateProfile()
    else:
        user.recruiter_profile = RecruiterProfile(company_name=clean_str(data, "company_name", 2, 150))
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ApiError("An account with this email already exists.", 409)
    return _token_response(user, 201)


@bp.post("/login")
@limiter.limit("20 per 15 minutes")
def login():
    data = get_json()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    user = User.query.filter_by(email=email).first()
    if user is None or not bcrypt.check_password_hash(user.password_hash, password):
        raise ApiError("Invalid email or password.", 401)
    if not user.is_active:
        raise ApiError("This account has been suspended. Contact the administrator.", 403)
    user.last_login_at = utcnow()
    db.session.commit()
    return _token_response(user)


@bp.get("/me")
@roles_required()
def me():
    return ok(g.current_user.to_dict())


@bp.post("/change-password")
@roles_required()
@limiter.limit("10 per hour")
def change_password():
    data = get_json()
    current = data.get("current_password") or ""
    if not bcrypt.check_password_hash(g.current_user.password_hash, current):
        raise ApiError("Current password is incorrect.", 400, {"field": "current_password"})
    new_password = validate_password(data.get("new_password"))
    g.current_user.password_hash = bcrypt.generate_password_hash(new_password).decode("utf-8")
    db.session.commit()
    return ok({"message": "Password updated."})


@bp.post("/logout")
@roles_required()
def logout():
    # Tokens are stateless; the client discards its token. Returned for API completeness.
    return ok({"message": "Logged out."})
