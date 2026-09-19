from __future__ import annotations

import logging
import json
from dataclasses import asdict
from datetime import datetime, timezone
from uuid import uuid4

from flask import Blueprint, current_app, jsonify, request
from pydantic import ValidationError

from ..extensions import limiter
from ..expression_lab import (
    ExpressionLabError,
    ExpressionTask,
    KnowledgeTermNotFound,
    build_knowledge_pack,
    generate_expression_report,
)


bp = Blueprint("expression_lab", __name__)
logger = logging.getLogger(__name__)


def _response(code: int, message: str, data=None):
    return jsonify({"code": code, "message": message, "data": data}), code


def _validation_fields(error: ValidationError) -> dict[str, str]:
    labels = {
        "term_ids": "请选择1至5个已发布术语",
        "source_text": "中文原文长度须为10至1000字",
        "target_language": "当前仅支持英语",
        "audience": "请选择有效受众",
        "scenario": "请选择有效传播场景",
        "style": "请选择有效表达风格",
        "locale": "请选择有效英语区域",
    }
    fields = {}
    for issue in error.errors():
        name = str(issue.get("loc", ["request"])[0])
        fields.setdefault(name, labels.get(name, "字段格式不正确"))
    return fields


@bp.post("/api/v1/expression-lab/analyze")
@limiter.limit(lambda: current_app.config["EXPRESSION_LAB_RATE_LIMIT"])
def analyze_expression():
    request_id = str(uuid4())
    max_bytes = current_app.config["EXPRESSION_LAB_MAX_BODY_BYTES"]
    if request.content_length is not None and request.content_length > max_bytes:
        return _response(413, "请求内容过大", None)
    if not request.is_json:
        return _response(415, "请求必须使用JSON格式", None)

    try:
        raw_body = request.input_stream.read(max_bytes + 1)
        if len(raw_body) > max_bytes:
            return _response(413, "请求内容过大", None)
        payload = json.loads(raw_body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return _response(400, "请求JSON格式不正确", None)

    try:
        task = ExpressionTask.model_validate(payload)
    except (ValidationError, TypeError) as exc:
        fields = _validation_fields(exc) if isinstance(exc, ValidationError) else {}
        return _response(400, "请求参数不正确", {"fields": fields})

    try:
        pack = build_knowledge_pack(
            task.term_ids,
            max_chars=current_app.config["EXPRESSION_LAB_MAX_KNOWLEDGE_CHARS"],
        )
        generator = current_app.config.get(
            "EXPRESSION_LAB_GENERATOR", generate_expression_report
        )
        report = generator(task, pack, request_id=request_id)
    except KnowledgeTermNotFound as exc:
        return _response(
            exc.status_code,
            exc.public_message,
            {"missing_term_ids": exc.missing_ids},
        )
    except ExpressionLabError as exc:
        return _response(exc.status_code, exc.public_message, None)
    except Exception as exc:
        logger.exception(
            "Unexpected expression analysis error",
            extra={"request_id": request_id, "error_type": type(exc).__name__},
        )
        return _response(500, "表达分析暂时不可用", None)

    data = {
        "request_id": request_id,
        "input_summary": {
            "source_text": task.source_text,
            "target_language": "en",
            "audience": task.audience.value,
            "scenario": task.scenario.value,
            "style": task.style.value,
            "locale": task.locale.value,
        },
        "knowledge_summary": asdict(pack.summary),
        "report": report.model_dump(mode="json", exclude={"warnings"}),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "review_status": "ai_unreviewed",
        "warnings": report.warnings,
    }
    return _response(200, "分析完成", data)
