import math
import re
from datetime import date, datetime, timezone

from flask import request

from app.errors import ApiError

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def get_json():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("Request body must be a JSON object.", 400)
    return data


def ok(data=None, status=200, meta=None):
    body = {"data": data}
    if meta is not None:
        body["meta"] = meta
    return body, status


def clean_str(data, field, min_len=1, max_len=255, required=True):
    value = data.get(field)
    if value is None or (isinstance(value, str) and value.strip() == ""):
        if required:
            raise ApiError(f"{field} is required.", 400, {"field": field})
        return None
    if not isinstance(value, str):
        raise ApiError(f"{field} must be text.", 400, {"field": field})
    value = value.strip()
    if not (min_len <= len(value) <= max_len):
        raise ApiError(f"{field} must be between {min_len} and {max_len} characters.", 400, {"field": field})
    return value


def parse_int(value, field, minimum, maximum):
    try:
        number = int(value)
    except (TypeError, ValueError):
        raise ApiError(f"{field} must be a whole number.", 400, {"field": field})
    if not (minimum <= number <= maximum):
        raise ApiError(f"{field} must be between {minimum} and {maximum}.", 400, {"field": field})
    return number


def validate_email(value):
    if not isinstance(value, str) or len(value) > 255 or not EMAIL_RE.match(value.strip()):
        raise ApiError("A valid email address is required.", 400, {"field": "email"})
    return value.strip().lower()


def validate_password(value):
    if not isinstance(value, str) or not (8 <= len(value) <= 72):
        raise ApiError("Password must be 8 to 72 characters.", 400, {"field": "password"})
    if not re.search(r"[A-Za-z]", value) or not re.search(r"\d", value):
        raise ApiError("Password must contain at least one letter and one number.", 400, {"field": "password"})
    return value


def parse_deadline(value):
    if value in (None, ""):
        return None
    try:
        deadline = date.fromisoformat(str(value))
    except ValueError:
        raise ApiError("deadline must be a date in YYYY-MM-DD format.", 400, {"field": "deadline"})
    if deadline < date.today():
        raise ApiError("deadline cannot be in the past.", 400, {"field": "deadline"})
    return deadline


def parse_datetime(value, field="scheduled_at"):
    if not isinstance(value, str):
        raise ApiError(f"{field} is required in ISO 8601 format.", 400, {"field": field})
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise ApiError(f"{field} must be a valid ISO 8601 date-time.", 400, {"field": field})
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def paginate(query):
    page = max(request.args.get("page", 1, type=int), 1)
    per_page = min(max(request.args.get("per_page", 10, type=int), 1), 50)
    total = query.order_by(None).count()
    items = query.limit(per_page).offset((page - 1) * per_page).all()
    pages = math.ceil(total / per_page) if total else 0
    return items, {"page": page, "per_page": per_page, "total": total, "pages": pages}


def paged_response(query, serializer):
    items, meta = paginate(query)
    return {"data": [serializer(item) for item in items], "meta": meta}, 200
