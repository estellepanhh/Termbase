from flask import Blueprint, jsonify

from ..services.public_topics import (
    get_published_topic,
    list_published_topics,
    serialize_topic_detail,
    serialize_topic_summary,
)


bp = Blueprint("public_topics", __name__)


@bp.get("/api/topics")
def list_topics():
    return jsonify({
        "code": 200,
        "data": [
            serialize_topic_summary(topic)
            for topic in list_published_topics()
        ],
    })


@bp.get("/api/topics/<string:slug>")
def get_topic(slug):
    topic = get_published_topic(slug)
    if topic is None:
        return jsonify({"code": 404, "message": "专题不存在或尚未发布"}), 404
    return jsonify({"code": 200, "data": serialize_topic_detail(topic)})
