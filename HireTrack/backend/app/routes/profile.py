from flask import Blueprint, g

from app.errors import ApiError
from app.extensions import db
from app.models import Education, Experience, Skill
from app.utils.auth import roles_required
from app.utils.helpers import clean_str, get_json, ok, parse_int

bp = Blueprint("profile", __name__, url_prefix="/api")

MAX_SKILLS = 50
MAX_LIST_ITEMS = 20


def get_or_create_skill(name):
    normalized = name.strip().lower()[:100]
    skill = Skill.query.filter_by(name=normalized).first()
    if skill is None:
        skill = Skill(name=normalized)
        db.session.add(skill)
    return skill


def skill_names_from(value, maximum):
    if value is None:
        return None
    if not isinstance(value, list) or len(value) > maximum:
        raise ApiError(f"skills must be a list of at most {maximum} names.", 400, {"field": "skills"})
    names = []
    for item in value:
        if not isinstance(item, str) or not (1 <= len(item.strip()) <= 100):
            raise ApiError("Each skill must be 1 to 100 characters.", 400, {"field": "skills"})
        normalized = item.strip().lower()
        if normalized not in names:
            names.append(normalized)
    return names


def _items(data, key):
    value = data.get(key)
    if value is None:
        return None
    if not isinstance(value, list) or len(value) > MAX_LIST_ITEMS:
        raise ApiError(f"{key} must be a list of at most {MAX_LIST_ITEMS} entries.", 400, {"field": key})
    for item in value:
        if not isinstance(item, dict):
            raise ApiError(f"Each {key} entry must be an object.", 400, {"field": key})
    return value


def _optional_year(item, field):
    value = item.get(field)
    if value in (None, ""):
        return None
    return parse_int(value, field, 1950, 2100)


def _candidate_payload(user):
    profile = user.candidate_profile
    return {
        "user": user.to_dict(),
        "headline": profile.headline,
        "phone": profile.phone,
        "location": profile.location,
        "summary": profile.summary,
        "years_experience": profile.years_experience,
        "education": [e.to_dict() for e in profile.education],
        "experience": [x.to_dict() for x in profile.experiences],
        "skills": [s.name for s in profile.skills],
    }


@bp.get("/candidate/profile")
@roles_required("candidate")
def get_candidate_profile():
    return ok(_candidate_payload(g.current_user))


@bp.put("/candidate/profile")
@roles_required("candidate")
def update_candidate_profile():
    data = get_json()
    profile = g.current_user.candidate_profile

    profile.headline = clean_str(data, "headline", 0, 150, required=False)
    profile.phone = clean_str(data, "phone", 0, 30, required=False)
    profile.location = clean_str(data, "location", 0, 120, required=False)
    profile.summary = clean_str(data, "summary", 0, 2000, required=False)
    if data.get("years_experience") is not None:
        profile.years_experience = parse_int(data["years_experience"], "years_experience", 0, 60)

    education_items = _items(data, "education")
    if education_items is not None:
        profile.education = [
            Education(
                institution=clean_str(item, "institution", 2, 150),
                degree=clean_str(item, "degree", 2, 120),
                field_of_study=clean_str(item, "field_of_study", 0, 120, required=False),
                start_year=_optional_year(item, "start_year"),
                end_year=_optional_year(item, "end_year"),
            )
            for item in education_items
        ]

    experience_items = _items(data, "experience")
    if experience_items is not None:
        profile.experiences = [
            Experience(
                title=clean_str(item, "title", 2, 120),
                company=clean_str(item, "company", 2, 150),
                start_year=_optional_year(item, "start_year"),
                end_year=_optional_year(item, "end_year"),
                is_current=bool(item.get("is_current", False)),
                description=clean_str(item, "description", 0, 2000, required=False),
            )
            for item in experience_items
        ]

    names = skill_names_from(data.get("skills"), MAX_SKILLS)
    if names is not None:
        profile.skills = [get_or_create_skill(name) for name in names]

    db.session.commit()
    return ok(_candidate_payload(g.current_user))


@bp.get("/recruiter/profile")
@roles_required("recruiter")
def get_recruiter_profile():
    profile = g.current_user.recruiter_profile
    return ok({"user": g.current_user.to_dict(), **profile.to_dict()})


@bp.put("/recruiter/profile")
@roles_required("recruiter")
def update_recruiter_profile():
    data = get_json()
    profile = g.current_user.recruiter_profile
    profile.company_name = clean_str(data, "company_name", 2, 150)
    website = clean_str(data, "website", 0, 255, required=False)
    if website and not website.lower().startswith(("http://", "https://")):
        raise ApiError("Website must start with http:// or https://.", 400, {"field": "website"})
    profile.website = website
    profile.industry = clean_str(data, "industry", 0, 120, required=False)
    profile.location = clean_str(data, "location", 0, 120, required=False)
    profile.description = clean_str(data, "description", 0, 2000, required=False)
    db.session.commit()
    return ok({"user": g.current_user.to_dict(), **profile.to_dict()})
