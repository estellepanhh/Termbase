from flask import Blueprint, jsonify, request
from sqlalchemy import func, or_, select

from ..extensions import db
from ..models import Term
from ..services.auth import require_admin


bp = Blueprint("term_admin", __name__)
ALLOWED_STATUSES = {"draft", "published"}
EDITABLE_FIELDS = (
    "preferred_name_zh",
    "definition_zh",
    "cultural_connotation",
    "term_level",
    "culture_category",
    "status",
)


def _serialize(term):
    return {"id": term.id, **{field: getattr(term, field) or "" for field in EDITABLE_FIELDS}, "updated_at": term.updated_at.isoformat() if term.updated_at else None}


def _payload():
    data = request.get_json(silent=True) or {}
    name = str(data.get("preferred_name_zh", "")).strip()
    status = str(data.get("status", "draft")).strip()
    if not name:
        return None, "术语名称不能为空"
    if status not in ALLOWED_STATUSES:
        return None, "状态只能是 draft 或 published"
    return {field: (str(data.get(field, "")).strip() if field != "status" else status) for field in EDITABLE_FIELDS}, None


def _admin_required_response():
    user_or_response = require_admin()
    if isinstance(user_or_response, tuple):
        return user_or_response
    return None


@bp.get("/api/v1/admin/terms")
def list_admin_terms():
    denied = _admin_required_response()
    if denied:
        return denied
    try:
        page = max(1, int(request.args.get("page", 1)))
        page_size = min(100, max(1, int(request.args.get("page_size", 20))))
    except ValueError:
        return jsonify({"code": 400, "message": "分页参数必须是整数"}), 400
    query = select(Term)
    keyword = request.args.get("q", "").strip()
    if keyword:
        pattern = f"%{keyword}%"
        query = query.where(or_(Term.preferred_name_zh.like(pattern), Term.definition_zh.like(pattern)))
    status = request.args.get("status", "").strip()
    if status in ALLOWED_STATUSES:
        query = query.where(Term.status == status)
    total = db.session.execute(select(func.count()).select_from(query.subquery())).scalar_one()
    terms = db.session.execute(query.order_by(Term.updated_at.desc(), Term.id.desc()).offset((page - 1) * page_size).limit(page_size)).scalars().all()
    return jsonify({"code": 200, "data": [_serialize(term) for term in terms], "meta": {"page": page, "page_size": page_size, "total": total}})


@bp.post("/api/v1/admin/terms")
def create_admin_term():
    denied = _admin_required_response()
    if denied:
        return denied
    values, error = _payload()
    if error:
        return jsonify({"code": 400, "message": error}), 400
    term = Term(**values, data_quality="curated")
    db.session.add(term)
    db.session.commit()
    return jsonify({"code": 201, "data": _serialize(term)}), 201


@bp.put("/api/v1/admin/terms/<int:term_id>")
def update_admin_term(term_id):
    denied = _admin_required_response()
    if denied:
        return denied
    term = db.session.get(Term, term_id)
    if term is None:
        return jsonify({"code": 404, "message": "术语不存在"}), 404
    values, error = _payload()
    if error:
        return jsonify({"code": 400, "message": error}), 400
    for field, value in values.items():
        setattr(term, field, value)
    db.session.commit()
    return jsonify({"code": 200, "data": _serialize(term)})


@bp.delete("/api/v1/admin/terms/<int:term_id>")
def delete_admin_term(term_id):
    denied = _admin_required_response()
    if denied:
        return denied
    term = db.session.get(Term, term_id)
    if term is None:
        return jsonify({"code": 404, "message": "术语不存在"}), 404
    if term.topic_items:
        return jsonify({"code": 409, "message": "该术语已被文化专题使用，请先解除专题关联"}), 409
    if term.review_case_links:
        return jsonify({"code": 409, "message": "该术语已进入评审案例，不能直接删除"}), 409
    if term.incoming_relations:
        return jsonify({"code": 409, "message": "该术语仍被其他术语关联，不能直接删除"}), 409
    db.session.delete(term)
    db.session.commit()
    return jsonify({"code": 200, "message": "术语已删除"})
