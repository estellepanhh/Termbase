from flask import Blueprint, jsonify

from ..services.project_overview import get_project_overview


bp = Blueprint("project_overview", __name__)


@bp.get("/api/project/overview")
def project_overview():
    return jsonify({"code": 200, "data": get_project_overview()})
