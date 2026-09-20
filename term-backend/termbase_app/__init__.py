from flask import Flask
from flask_cors import CORS

from .config import Config
from flask_limiter.errors import RateLimitExceeded

from .extensions import db, limiter, migrate
from . import models  # noqa: F401
from .routes.ai import bp as ai_bp, init_app as init_ai
from .routes.health import bp as health_bp
from .routes.legacy import bp as legacy_bp
from .routes.public_terms import bp as public_terms_bp
from .routes.expression_lab import bp as expression_lab_bp
from .routes.review_workspace import bp as review_workspace_bp


def create_app(config_overrides=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if config_overrides:
        app.config.update(config_overrides)
    db.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": app.config.get(
        "CORS_ORIGINS", ["http://localhost:5173"]
    )}})
    init_ai(app)
    app.register_blueprint(health_bp)
    app.register_blueprint(public_terms_bp)
    app.register_blueprint(legacy_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(expression_lab_bp)
    app.register_blueprint(review_workspace_bp)

    @app.errorhandler(RateLimitExceeded)
    def handle_rate_limit(_error):
        return {
            "code": 429,
            "message": "请求过于频繁，请稍后重试",
            "data": None,
        }, 429

    return app
