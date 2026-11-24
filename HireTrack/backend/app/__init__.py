from flask import Flask
from flask_cors import CORS

from app.cli import register_cli
from app.errors import register_error_handlers
from app.extensions import bcrypt, db, jwt, limiter, migrate
from config import Config


def create_app(config_object=Config):
    app = Flask(__name__)
    app.config.from_object(config_object)

    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})
    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)
    limiter.init_app(app)
    migrate.init_app(app, db)

    from app import models  # noqa: F401  (register models with SQLAlchemy)
    from app.routes import register_blueprints

    register_blueprints(app)
    register_error_handlers(app, jwt)
    register_cli(app)

    @app.after_request
    def security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        if app.config.get("APP_ENV") == "production":
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        if response.mimetype == "application/json":
            response.headers.setdefault("Cache-Control", "no-store")
        return response

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    return app
