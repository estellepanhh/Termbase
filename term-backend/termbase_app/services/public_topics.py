from collections import Counter

from sqlalchemy.orm import selectinload

from ..extensions import db
from ..models import Term, Topic, TopicItem, Translation


PUBLIC_PAYLOAD_FIELDS = {
    "person": ("分类", "百度链接", "简介", "生平", "代表事迹"),
    "place": ("分类", "地点", "简介", "地理位置", "文化价值"),
    "culture": ("分类", "简介", "文化内涵", "来源"),
    "herb": ("中文品名", "官方译法（英文）", "法语译法", "简介", "功效"),
}
ENTRY_TYPE_ORDER = {"term": 0, "person": 1, "place": 2, "culture": 3, "herb": 4}


def _topic_load_options():
    return (
        selectinload(Topic.items)
        .selectinload(TopicItem.term)
        .selectinload(Term.translations)
        .selectinload(Translation.language),
    )


def list_published_topics():
    stmt = (
        db.select(Topic)
        .where(Topic.status == "published")
        .options(*_topic_load_options())
        .order_by(Topic.id)
    )
    return list(db.session.scalars(stmt))


def get_published_topic(slug):
    stmt = (
        db.select(Topic)
        .where(Topic.slug == slug, Topic.status == "published")
        .options(*_topic_load_options())
    )
    return db.session.scalar(stmt)


def public_items(topic):
    items = [
        item
        for item in topic.items
        if item.term is None or item.term.status == "published"
    ]
    return sorted(
        items,
        key=lambda item: (ENTRY_TYPE_ORDER.get(item.entry_type, 99), item.id),
    )


def serialize_topic_summary(topic):
    items = public_items(topic)
    type_counts = Counter(item.entry_type for item in items)
    return {
        "slug": topic.slug,
        "title": topic.title,
        "summary": topic.summary,
        "item_count": len(items),
        "term_count": sum(item.term is not None for item in items),
        "entry_type_counts": dict(sorted(type_counts.items())),
    }


def serialize_public_fields(item):
    payload = item.payload or {}
    allowed = PUBLIC_PAYLOAD_FIELDS.get(item.entry_type, ())
    return {
        key: payload[key]
        for key in allowed
        if payload.get(key) not in (None, "")
    }


def _recommended_translation(term):
    translations = sorted(term.translations, key=lambda item: item.id)
    recommended = next(
        (item for item in translations if item.translation_type == "recommended"),
        None,
    )
    return recommended.text if recommended else None


def serialize_topic_item(item):
    result = {
        "id": item.id,
        "entry_type": item.entry_type,
        "title": item.title,
        "term": None,
        "fields": {},
    }
    if item.term is not None:
        result["term"] = {
            "id": item.term.id,
            "preferred_name_zh": item.term.preferred_name_zh,
            "definition_zh": item.term.definition_zh,
            "term_level": item.term.term_level,
            "culture_category": item.term.culture_category,
            "recommended_translation": _recommended_translation(item.term),
        }
    else:
        result["fields"] = serialize_public_fields(item)
    return result


def serialize_topic_detail(topic):
    result = serialize_topic_summary(topic)
    result["items"] = [serialize_topic_item(item) for item in public_items(topic)]
    return result
