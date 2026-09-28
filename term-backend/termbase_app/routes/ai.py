import json
import logging
import os

from flask import Blueprint, Response, current_app, jsonify, request, stream_with_context
from openai import OpenAI

from ..services.auth import current_user_from_request


bp = Blueprint("ai", __name__)
logger = logging.getLogger(__name__)


def init_app(app):
    app.config.setdefault(
        "DEEPSEEK_API_KEY", os.environ.get("DEEPSEEK_API_KEY", "")
    )
    app.config.setdefault(
        "DEEPSEEK_BASE_URL",
        os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
    )
    app.config.setdefault(
        "DEEPSEEK_MODEL", os.environ.get("DEEPSEEK_MODEL", "deepseek-flash")
    )
    app.config.setdefault(
        "AI_MAX_MESSAGE_CHARS", int(os.environ.get("AI_MAX_MESSAGE_CHARS", "500"))
    )

    if "DEEPSEEK_CLIENT" in app.config:
        client = app.config["DEEPSEEK_CLIENT"]
    elif app.config["DEEPSEEK_API_KEY"]:
        client = OpenAI(
            api_key=app.config["DEEPSEEK_API_KEY"],
            base_url=app.config["DEEPSEEK_BASE_URL"],
        )
    else:
        client = None
        if not app.config.get("TESTING"):
            logger.warning("DeepSeek AI 未配置，/api/chat/stream 将不可用")
    app.extensions["deepseek_client"] = client


def _fail(message, status):
    return jsonify({"code": status, "msg": message}), status


@bp.post("/api/chat/stream")
def chat_stream():
    if current_user_from_request() is None:
        return _fail("请先登录后使用 AI 助手", 401)
    client = current_app.extensions.get("deepseek_client")
    if client is None:
        return _fail("AI 服务未配置", 503)

    data = request.json or {}
    user_message = data.get("message", "").strip()
    if not user_message:
        return _fail("消息不能为空", 400)
    max_chars = int(current_app.config.get("AI_MAX_MESSAGE_CHARS", 500))
    if len(user_message) > max_chars:
        return _fail(f"消息过长，请控制在 {max_chars} 字以内", 413)

    def generate():
        try:
            completion = client.chat.completions.create(
                model=current_app.config["DEEPSEEK_MODEL"],
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "你是中华文化术语库的AI助手，请用通俗易懂、"
                            "简洁的语言回答关于中华文化、术语、历史等方面的问题。"
                        ),
                    },
                    {"role": "user", "content": user_message},
                ],
                stream=True,
                temperature=0.7,
            )
            for chunk in completion:
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    yield f"data: {json.dumps({'content': content})}\n\n"
        except Exception:
            logger.error("AI 流式对话出错")
            yield f"data: {json.dumps({'error': 'AI 服务暂时不可用'})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
    )
