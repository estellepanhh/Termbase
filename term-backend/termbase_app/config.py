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
