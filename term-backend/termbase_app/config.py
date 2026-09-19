import os
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def database_uri() -> str:
    user = quote_plus(os.environ.get("DB_USER", "root"))
    password = quote_plus(os.environ.get("DB_PASSWORD", ""))
    host = os.environ.get("DB_HOST", "localhost")
    name = os.environ.get("DB_NAME", "term_database")
    return f"mysql+pymysql://{user}:{password}@{host}/{name}?charset=utf8mb4"


class Config:
    SQLALCHEMY_DATABASE_URI = database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JSON_AS_ASCII = False
    EXPRESSION_LAB_RATE_LIMIT = os.environ.get(
        "EXPRESSION_LAB_RATE_LIMIT", "5 per minute"
    )
    RATELIMIT_STORAGE_URI = os.environ.get("RATELIMIT_STORAGE_URI", "memory://")
    EXPRESSION_LAB_MAX_KNOWLEDGE_CHARS = int(
        os.environ.get("EXPRESSION_LAB_MAX_KNOWLEDGE_CHARS", "18000")
    )
    EXPRESSION_LAB_PROVIDER_TIMEOUT = float(
        os.environ.get("EXPRESSION_LAB_PROVIDER_TIMEOUT", "45")
    )
    EXPRESSION_LAB_MAX_BODY_BYTES = int(
        os.environ.get("EXPRESSION_LAB_MAX_BODY_BYTES", "16384")
    )
