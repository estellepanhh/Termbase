from flask import Blueprint, jsonify, request

from ..services.public_terms import (
    get_published_term,
    list_published_terms,
    serialize_term_detail,
    serialize_term_summary,
)


bp = Blueprint("public_terms", __name__)


@bp.get("/api/v1/terms")
def list_terms():
    try:
        page = int(request.args.get("page", 1))
        page_size = int(request.args.get("page_size", 20))
    except ValueError:
        return jsonify({"code": 400, "message": "分页参数必须是整数"}), 400

    terms = list_published_terms(
        q=request.args.get("q", ""),
        level=request.args.get("level", ""),
        culture=request.args.get("culture", ""),
        language=request.args.get("language", ""),
        page=page,
        page_size=page_size,
    )
    return jsonify({
        "code": 200,
        "data": [serialize_term_summary(item) for item in terms.items],
        "meta": {
            "page": terms.page,
            "page_size": terms.per_page,
            "total": terms.total,
        },
    })


@bp.get("/api/v1/terms/<int:term_id>")
def get_term(term_id):
    term = get_published_term(term_id)
    if term is None:
        return jsonify({"code": 404, "message": "术语不存在或尚未发布"}), 404
    return jsonify({"code": 200, "data": serialize_term_detail(term)})
