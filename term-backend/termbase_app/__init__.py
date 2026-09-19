from flask import Flask
from flask_cors import CORS

from .config import Config
from .extensions import db, migrate
from . import models  # noqa: F401
from .routes.ai import bp as ai_bp, init_app as init_ai
from .routes.health import bp as health_bp
from .routes.legacy import bp as legacy_bp
from .routes.public_terms import bp as public_terms_bp


def create_app(config_overrides=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if config_overrides:
        app.config.update(config_overrides)
    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app, resources={r"/api/*": {"origins": app.config.get(
        "CORS_ORIGINS", ["http://localhost:5173"]
    )}})
    init_ai(app)
    app.register_blueprint(health_bp)
    app.register_blueprint(public_terms_bp)
    app.register_blueprint(legacy_bp)
    app.register_blueprint(ai_bp)
    return app
