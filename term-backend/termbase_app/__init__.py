from flask import Flask
from flask_cors import CORS

from .config import Config
from .extensions import db, migrate
from .routes.health import bp as health_bp


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
    app.register_blueprint(health_bp)
    return app
