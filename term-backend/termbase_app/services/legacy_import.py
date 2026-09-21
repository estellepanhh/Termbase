"""Import the legacy knowledge tables into the normalized ``kb_`` schema."""

from dataclasses import dataclass
import hashlib
import json
import math
import re
import unicodedata
from datetime import date, datetime

from sqlalchemy import inspect, text

from ..models import Context, Language, Source, Term, TermContext, Topic, TopicItem, Translation


HUAIHE_TOPIC_SUMMARY = (
    "以淮河流域术语、历史人物与本草知识为线索，"
    "呈现地域文化的多语表达与传播语境。"
)


@dataclass
class ImportReport:
    terms_created: int = 0
    translations_created: int = 0
    sources_created: int = 0
    topic_items_created: int = 0
    skipped: int = 0


class LegacyIdentityConflictError(ValueError):
    """Raised when source rows cannot be distinguished by legacy identity."""


def clean(value) -> str:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return ""
    text_value = str(value).strip()
    return "" if text_value.lower() == "nan" else text_value


def import_legacy_knowledge(session) -> ImportReport:
    """Copy known legacy rows without modifying their source tables."""
    report = ImportReport()
    table_names = set(inspect(session.get_bind()).get_table_names())

    try:
        if "terms" in table_names:
            _import_terms(session, "terms", report)
        if "huaihe_terms" in table_names:
            topic = _get_huaihe_topic(session)
            _import_terms(session, "huaihe_terms", report, topic)
        if "huaihe_figures" in table_names:
            _import_topic_entries(session, "huaihe_figures", "person", "人物", report)
        if "huaihe_herbs" in table_names:
            _import_topic_entries(session, "huaihe_herbs", "herb", "中文品名", report)
        session.commit()
    except Exception:
        session.rollback()
        raise

    return report


def _import_terms(session, table_name, report, topic=None):
    for legacy_id, row in _identified_rows(
        table_name, _legacy_rows(session, table_name), "id"
    ):
        term = session.query(Term).filter_by(
            legacy_table=table_name, legacy_id=legacy_id
        ).one_or_none()
        if term is None:
            term = Term(
                preferred_name_zh=clean(row.get("术语名称")),
                term_level=clean(row.get("术语层级")),
                culture_category=clean(row.get("文化分类")),
                cultural_connotation=clean(row.get("文化内涵")),
                status="published",
                data_quality="legacy_unreviewed",
                legacy_payload=_json_safe(row),
                legacy_table=table_name,
                legacy_id=legacy_id,
            )
            session.add(term)
            report.terms_created += 1
            _add_translations(session, term, row, report)
            _add_source(session, term, clean(row.get("来源")), report)
            _add_contexts(session, term, row)
        else:
            report.skipped += 1

        if topic is not None:
            _add_topic_item(session, topic, term, row, table_name, legacy_id, "term", report)


def _import_topic_entries(session, table_name, entry_type, title_column, report):
    topic = _get_huaihe_topic(session)
    rows = _legacy_rows(session, table_name)
    identity_column = "id" if rows and "id" in rows[0] else title_column
    for legacy_id, row in _identified_rows(
        table_name, rows, identity_column
    ):
        _add_topic_item(
            session,
            topic,
            None,
            row,
            table_name,
            legacy_id,
            entry_type,
            report,
            title=clean(row.get(title_column)),
        )


def _legacy_rows(session, table_name):
    return [dict(row._mapping) for row in session.execute(text(f"SELECT * FROM {table_name}"))]


def _identified_rows(table_name, rows, identity_column):
    identities = set()
    identified_rows = []
    for row in rows:
        legacy_id = _legacy_identity(table_name, row, identity_column)
        if legacy_id in identities:
            raise LegacyIdentityConflictError(
                f"Ambiguous legacy rows in {table_name}: duplicate identity {legacy_id!r}"
            )
        identities.add(legacy_id)
        identified_rows.append((legacy_id, row))
    return identified_rows


def _legacy_identity(table_name, row, identity_column):
    value = row.get(identity_column)
    if value is not None:
        return value if isinstance(value, str) else str(value)
    serialized_row = json.dumps(
        {"table": table_name, "row": _canonical_row(row)},
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    digest = hashlib.sha256(serialized_row.encode("utf-8")).hexdigest()
    return f"fingerprint:{digest}"


def _canonical_row(row):
    return {key: _canonical_value(value) for key, value in sorted(row.items())}


def _json_safe(value):
    """Return a portable JSON value while retaining every legacy field."""
    if value is None or isinstance(value, (str, int, float, bool)):
        if isinstance(value, float) and math.isnan(value):
            return None
        return value
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(item) for item in value]
    return str(value)


def _canonical_value(value):
    if value is None:
        return {"type": "null", "value": None}
    if isinstance(value, float) and math.isnan(value):
        return {"type": "float", "value": "NaN"}
    return {
        "type": f"{type(value).__module__}.{type(value).__qualname__}",
        "value": str(value),
    }


def _add_translations(session, term, row, report):
    for column, language_code, name_zh, name_en in (
        ("官方译法（英文）", "en", "英语", "English"),
        ("官方译法（小语种）", "und", "未指定语言", "Undetermined"),
    ):
        translation_text = clean(row.get(column))
        if not translation_text:
            continue
        language = _get_language(session, language_code, name_zh, name_en)
        session.add(
            Translation(
                term=term,
                language=language,
                text=translation_text,
                translation_type="official",
                authority_level="legacy_unverified",
                review_status="unreviewed",
            )
        )
        report.translations_created += 1


def _add_source(session, term, legacy_value, report):
    if not legacy_value:
        return
    source = session.query(Source).filter_by(
        legacy_value=legacy_value, source_type="legacy_text"
    ).one_or_none()
    if source is None:
        source = Source(
            title=legacy_value,
            legacy_value=legacy_value,
            source_type="legacy_text",
            authority_level="unverified",
        )
        session.add(source)
        report.sources_created += 1
    term.sources.append(source)


def _add_contexts(session, term, row):
    scene = clean(row.get("场景分类"))
    if scene:
        context = _get_context(session, _legacy_context_code(scene), scene)
        session.add(TermContext(term=term, context=context))

    child_explanation = clean(row.get("儿童解释"))
    if child_explanation:
        context = _get_context(session, "children", "儿童")
        session.add(
            TermContext(term=term, context=context, explanation=child_explanation)
        )


def _add_topic_item(
    session, topic, term, row, table_name, legacy_id, entry_type, report, title=None
):
    existing = session.query(TopicItem).filter_by(
        topic_id=topic.id,
        legacy_table=table_name,
        legacy_id=legacy_id,
    ).one_or_none()
    if existing is not None:
        if entry_type != "term":
            report.skipped += 1
        return

    session.add(
        TopicItem(
            topic=topic,
            term=term,
            entry_type=entry_type,
            title=title if title is not None else clean(row.get("术语名称")),
            payload={key: _payload_value(value) for key, value in row.items()},
            legacy_table=table_name,
            legacy_id=legacy_id,
        )
    )
    report.topic_items_created += 1


def _get_language(session, code, name_zh, name_en):
    language = session.query(Language).filter_by(code=code).one_or_none()
    if language is None:
        language = Language(code=code, name_zh=name_zh, name_en=name_en)
        session.add(language)
    return language


def _get_context(session, code, name_zh):
    context = session.query(Context).filter_by(code=code).one_or_none()
    if context is None:
        context = Context(code=code, name_zh=name_zh)
        session.add(context)
    return context


def _get_huaihe_topic(session):
    topic = session.query(Topic).filter_by(slug="huaihe-culture").one_or_none()
    if topic is None:
        topic = Topic(
            slug="huaihe-culture",
            title="淮河文化",
            summary=HUAIHE_TOPIC_SUMMARY,
            status="published",
        )
        session.add(topic)
        session.flush()
    else:
        topic.status = "published"
        if not topic.summary:
            topic.summary = HUAIHE_TOPIC_SUMMARY
    return topic


def _slug(value):
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")
    if slug:
        return slug[:42]
    return f"scene-{hashlib.sha1(value.encode('utf-8')).hexdigest()[:16]}"


def _legacy_context_code(scene):
    readable_slug = _slug(scene)
    digest = hashlib.sha256(scene.encode("utf-8")).hexdigest()[:12]
    readable_limit = 50 - len("legacy--") - len(digest)
    return f"legacy-{readable_slug[:readable_limit]}-{digest}"


def _payload_value(value):
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return ""
    return value
