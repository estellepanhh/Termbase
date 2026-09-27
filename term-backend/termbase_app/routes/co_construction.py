from uuid import uuid4

from flask import Blueprint, jsonify, request
from sqlalchemy import func, select

from ..extensions import db
from ..models import Term, TermSubmission
from ..services.auth import current_user_from_request, require_admin


bp = Blueprint("co_construction", __name__)

EDITABLE_FIELDS = (
    "preferred_name_zh",
    "definition_zh",
    "recommended_translation",
    "cultural_connotation",
    "source_text",
)


def _require_user():
    user = current_user_from_request()
    if user is None:
        return None, (jsonify({"code": 401, "message": "请先登录"}), 401)
    return user, None


def _payload():
    data = request.get_json(silent=True) or {}
    values = {field: str(data.get(field, "")).strip() for field in EDITABLE_FIELDS}
    if not values["preferred_name_zh"]:
        return None, "术语名称不能为空"
    if not values["definition_zh"]:
        return None, "定义说明不能为空"
    return values, None


def _serialize(submission: TermSubmission):
    return {
        "id": submission.id,
        "public_id": submission.public_id,
        "preferred_name_zh": submission.preferred_name_zh,
        "definition_zh": submission.definition_zh,
        "recommended_translation": submission.recommended_translation,
        "cultural_connotation": submission.cultural_connotation,
        "source_text": submission.source_text,
        "status": submission.status,
        "review_note": submission.review_note,
        "term_id": submission.term_id,
        "created_at": submission.created_at.isoformat() if submission.created_at else None,
        "updated_at": submission.updated_at.isoformat() if submission.updated_at else None,
    }


def _get_owned_submission(public_id, user):
    submission = TermSubmission.query.filter_by(public_id=public_id, created_by_id=user.id).first()
    if submission is None:
        return None, (jsonify({"code": 404, "message": "共建记录不存在"}), 404)
    if submission.status not in {"pending", "rejected"}:
        return None, (jsonify({"code": 409, "message": "当前状态不能修改"}), 409)
    return submission, None


@bp.post("/api/v1/co-construction/submissions")
def create_submission():
    user, denied = _require_user()
    if denied:
        return denied
    values, error = _payload()
    if error:
        return jsonify({"code": 400, "message": error}), 400
    duplicate = TermSubmission.query.filter_by(
        created_by_id=user.id,
        preferred_name_zh=values["preferred_name_zh"],
        status="pending",
    ).first()
    if duplicate:
        return jsonify({"code": 409, "message": "已有同名待审核共建记录"}), 409
    submission = TermSubmission(public_id=uuid4().hex, created_by_id=user.id, status="pending", **values)
    db.session.add(submission)
    db.session.commit()
    return jsonify({"code": 201, "data": _serialize(submission)}), 201


@bp.get("/api/v1/co-construction/submissions")
def list_submissions():
    user, denied = _require_user()
    if denied:
        return denied
    submissions = TermSubmission.query.filter_by(created_by_id=user.id).order_by(TermSubmission.updated_at.desc(), TermSubmission.id.desc()).all()
    return jsonify({"code": 200, "data": [_serialize(item) for item in submissions], "meta": {"total": len(submissions)}})


@bp.put("/api/v1/co-construction/submissions/<public_id>")
def update_submission(public_id):
    user, denied = _require_user()
    if denied:
        return denied
    submission, error_response = _get_owned_submission(public_id, user)
    if error_response:
        return error_response
    values, error = _payload()
    if error:
        return jsonify({"code": 400, "message": error}), 400
    for field, value in values.items():
        setattr(submission, field, value)
    submission.status = "pending"
    submission.review_note = ""
    db.session.commit()
    return jsonify({"code": 200, "data": _serialize(submission)})


@bp.post("/api/v1/co-construction/submissions/<public_id>/withdraw")
def withdraw_submission(public_id):
    user, denied = _require_user()
    if denied:
        return denied
    submission, error_response = _get_owned_submission(public_id, user)
    if error_response:
        return error_response
    submission.status = "withdrawn"
    db.session.commit()
    return jsonify({"code": 200, "data": _serialize(submission)})


@bp.get("/api/v1/admin/co-construction/submissions")
def list_admin_submissions():
    denied = require_admin()
    if isinstance(denied, tuple):
        return denied
    status = request.args.get("status", "pending").strip()
    query = select(TermSubmission)
    if status:
        query = query.where(TermSubmission.status == status)
    total = db.session.execute(select(func.count()).select_from(query.subquery())).scalar_one()
    rows = db.session.execute(query.order_by(TermSubmission.updated_at.desc(), TermSubmission.id.desc())).scalars().all()
    return jsonify({"code": 200, "data": [_serialize(item) for item in rows], "meta": {"total": total}})


@bp.post("/api/v1/admin/co-construction/submissions/<public_id>/approve")
def approve_submission(public_id):
    denied = require_admin()
    if isinstance(denied, tuple):
        return denied
    submission = TermSubmission.query.filter_by(public_id=public_id).first()
    if submission is None:
        return jsonify({"code": 404, "message": "共建记录不存在"}), 404
    if submission.status != "pending":
        return jsonify({"code": 409, "message": "只能通过待审核记录"}), 409
    term = Term(
        preferred_name_zh=submission.preferred_name_zh,
        definition_zh=submission.definition_zh,
        cultural_connotation=submission.cultural_connotation,
        status="published",
        data_quality="curated",
        legacy_payload={
            "co_construction_public_id": submission.public_id,
            "recommended_translation": submission.recommended_translation,
            "source_text": submission.source_text,
        },
    )
    db.session.add(term)
    db.session.flush()
    submission.term_id = term.id
    submission.status = "approved"
    submission.review_note = ""
    db.session.commit()
    return jsonify({"code": 200, "data": _serialize(submission)})


@bp.post("/api/v1/admin/co-construction/submissions/<public_id>/reject")
def reject_submission(public_id):
    denied = require_admin()
    if isinstance(denied, tuple):
        return denied
    submission = TermSubmission.query.filter_by(public_id=public_id).first()
    if submission is None:
        return jsonify({"code": 404, "message": "共建记录不存在"}), 404
    if submission.status != "pending":
        return jsonify({"code": 409, "message": "只能驳回待审核记录"}), 409
    data = request.get_json(silent=True) or {}
    submission.status = "rejected"
    submission.review_note = str(data.get("review_note", "")).strip()
    db.session.commit()
    return jsonify({"code": 200, "data": _serialize(submission)})
