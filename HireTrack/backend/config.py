import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()

_DEV_SECRET = "dev-secret-change-me"
_DEV_JWT = "dev-jwt-change-me"


class Config:
    APP_ENV = os.getenv("APP_ENV", "development")
    SECRET_KEY = os.getenv("SECRET_KEY", _DEV_SECRET)
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", _DEV_JWT)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=int(os.getenv("JWT_EXPIRES_MINUTES", "60")))
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", "postgresql+psycopg2://hiretrack:hiretrack@localhost:5432/hiretrack"
    ).replace("postgres://", "postgresql+psycopg2://", 1).replace("postgresql://", "postgresql+psycopg2://", 1)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}
    MAX_CONTENT_LENGTH = 6 * 1024 * 1024  # request-level guard (multipart overhead)
    RESUME_MAX_BYTES = 5 * 1024 * 1024
    MAX_RESUMES_PER_CANDIDATE = 5
    CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_ENABLED = True
    MATCH_WEIGHT_SKILL = float(os.getenv("MATCH_WEIGHT_SKILL", "0.6"))
    MATCH_WEIGHT_SEMANTIC = float(os.getenv("MATCH_WEIGHT_SEMANTIC", "0.4"))
    MATCH_RECOMMEND_MIN_SCORE = int(os.getenv("MATCH_RECOMMEND_MIN_SCORE", "15"))
    USE_SENTENCE_TRANSFORMERS = os.getenv("USE_SENTENCE_TRANSFORMERS", "false").lower() == "true"
    SENTENCE_MODEL_NAME = os.getenv("SENTENCE_MODEL_NAME", "all-MiniLM-L6-v2")


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    SQLALCHEMY_ENGINE_OPTIONS = {}
    RATELIMIT_ENABLED = False
    JWT_SECRET_KEY = "test-jwt-secret-with-enough-length-123456"
    SECRET_KEY = "test-secret"
    CORS_ORIGINS = ["http://localhost:5173"]


if os.getenv("APP_ENV") == "production":
    if Config.SECRET_KEY == _DEV_SECRET or Config.JWT_SECRET_KEY == _DEV_JWT:
        raise RuntimeError("SECRET_KEY and JWT_SECRET_KEY must be set in production.")
