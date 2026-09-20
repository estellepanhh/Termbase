from __future__ import annotations

import json
import logging
from uuid import uuid4

from flask import Blueprint, current_app, jsonify, request
from pydantic import ValidationError

from ..review_workspace.contracts import (
    CreateReviewCase,
    CreateRevision,
    IssueTag,
    ReviewStatus,
    TransitionCase,
)
from ..review_workspace.export import export_cases
from ..review_workspace.serializers import (
    serialize_case_detail,
    serialize_case_summary,
    serialize_revision,
)
from ..review_workspace.service import (
    ReviewTermNotFound,
    ReviewWorkspaceError,
    add_revision,
    create_case,
    get_case,
    list_cases,
    transition_case,
    workspace_stats,
)


bp = Blueprint("review_workspace", __name__)
logger = logging.getLogger(__name__)


class RequestProblem(Exception):
    def __init__(self, status, message, data=None):
        self.status = status
        self.message = message
        self.data = data


def _envelope(code, message, data=None):
    return jsonify({"code": code, "message": message, "data": data}), code


def _parse_json(model):
    max_bytes = current_app.config["REVIEW_WORKSPACE_MAX_BODY_BYTES"]
    if request.content_length is not None and request.content_length > max_bytes:
        raise RequestProblem(413, "请求内容过大")
    if not request.is_json:
        raise RequestProblem(415, "请求必须使用JSON格式")
    try:
        raw = request.input_stream.read(max_bytes + 1)
        if len(raw) > max_bytes:
            raise RequestProblem(413, "请求内容过大")
        payload = json.loads(raw)
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise RequestProblem(400, "请求JSON格式不正确") from None
    try:
        return model.model_validate(payload)
    except ValidationError as exc:
        fields = {}
        for issue in exc.errors(include_input=False, include_url=False):
            name = str(issue.get("loc", ["request"])[0])
            fields.setdefault(name, "字段格式不正确")
        raise RequestProblem(400, "请求参数不正确", {"fields": fields}) from None


def _filters():
    try:
        page = int(request.args.get("page", 1))
        page_size = int(request.args.get("page_size", 20))
        term_value = request.args.get("term_id", "")
        term_id = int(term_value) if term_value else None
    except ValueError:
        raise RequestProblem(400, "分页或术语参数必须是整数") from None
    status = request.args.get("status", "")
    issue_tag = request.args.get("issue_tag", "")
    if status and status not in {item.value for item in ReviewStatus}:
        raise RequestProblem(400, "案例状态不正确")
    if issue_tag and issue_tag not in {item.value for item in IssueTag}:
        raise RequestProblem(400, "问题标签不正确")
    return {
        "page": page,
        "page_size": page_size,
        "status": status,
        "term_id": term_id,
        "reviewer": request.args.get("reviewer", ""),
        "issue_tag": issue_tag,
        "q": request.args.get("q", ""),
    }


def _run(operation):
    request_id = uuid4().hex
    try:
        return operation()
    except RequestProblem as exc:
        return _envelope(exc.status, exc.message, exc.data)
    except ReviewTermNotFound as exc:
        return _envelope(exc.status_code, exc.public_message, {"missing_term_ids": exc.missing_ids})
    except ReviewWorkspaceError as exc:
        return _envelope(exc.status_code, exc.public_message)
    except Exception as exc:
        logger.exception(
            "Unexpected review workspace error",
            extra={"request_id": request_id, "error_type": type(exc).__name__},
        )
        return _envelope(500, "研究工作台暂时不可用")


@bp.post("/api/v1/review-cases")
def create_review_case():
    def operation():
        case, created = create_case(_parse_json(CreateReviewCase))
        code = 201 if created else 200
        return _envelope(code, "案例已保存" if created else "案例已存在", {
            "case": serialize_case_summary(case), "created": created,
        })
    return _run(operation)


@bp.get("/api/v1/review-cases")
def list_review_cases():
    def operation():
        filters = _filters()
        page = list_cases(**filters)
        return jsonify({
            "code": 200,
            "message": "查询成功",
            "data": [serialize_case_summary(case) for case in page.items],
            "meta": {
                "page": page.page, "page_size": page.per_page, "total": page.total,
                "stats": workspace_stats(),
            },
        })
    return _run(operation)


@bp.get("/api/v1/review-cases/export")
def export_review_cases():
    def operation():
        filters = _filters()
        filters.pop("page")
        filters.pop("page_size")
        format_name = request.args.get("format", "json")
        if format_name not in {"json", "csv"}:
            raise RequestProblem(400, "导出格式只支持json或csv")
        return export_cases(format_name, filters)
    return _run(operation)


@bp.get("/api/v1/review-cases/<string:public_id>")
def get_review_case(public_id):
    return _run(lambda: _envelope(200, "查询成功", serialize_case_detail(get_case(public_id))))


@bp.post("/api/v1/review-cases/<string:public_id>/revisions")
def create_review_revision(public_id):
    def operation():
        saved = add_revision(public_id, _parse_json(CreateRevision))
        return _envelope(201, "修订已保存", serialize_revision(saved))
    return _run(operation)


@bp.post("/api/v1/review-cases/<string:public_id>/transitions")
def transition_review_case(public_id):
    def operation():
        case = transition_case(public_id, _parse_json(TransitionCase))
        return _envelope(200, "状态已更新", serialize_case_detail(case))
    return _run(operation)
