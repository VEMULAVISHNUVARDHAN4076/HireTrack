import logging

from flask import jsonify
from werkzeug.exceptions import HTTPException

from app.extensions import db

logger = logging.getLogger(__name__)


class ApiError(Exception):
    """Expected, client-facing error. Carries an HTTP status and optional details."""

    def __init__(self, message, status=400, details=None):
        super().__init__(message)
        self.message = message
        self.status = status
        self.details = details


def error_response(message, status, details=None):
    body = {"error": {"message": message, "status": status}}
    if details:
        body["error"]["details"] = details
    return jsonify(body), status


def register_error_handlers(app, jwt):
    @app.errorhandler(ApiError)
    def handle_api_error(err):
        return error_response(err.message, err.status, err.details)

    @app.errorhandler(HTTPException)
    def handle_http_error(err):
        return error_response(err.description or err.name, err.code)

    @app.errorhandler(Exception)
    def handle_unexpected(err):
        db.session.rollback()
        logger.exception("Unhandled error")
        return error_response("An unexpected error occurred.", 500)

    @jwt.unauthorized_loader
    def missing_token(reason):
        return error_response("Authentication required.", 401)

    @jwt.invalid_token_loader
    def invalid_token(reason):
        return error_response("Invalid authentication token.", 401)

    @jwt.expired_token_loader
    def expired_token(jwt_header, jwt_payload):
        return error_response("Your session has expired. Please log in again.", 401)
