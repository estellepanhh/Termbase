from flask import Blueprint, jsonify


bp = Blueprint("health", __name__)


@bp.get("/api/v1/health")
def health():
    return jsonify({"code": 200, "data": {"status": "ok"}})
