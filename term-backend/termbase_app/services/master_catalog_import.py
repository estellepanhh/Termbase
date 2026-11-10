"""Read and validate the reviewed multilingual master catalog workbook."""

from __future__ import annotations

import re
import hashlib
import unicodedata
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from openpyxl import load_workbook
from sqlalchemy import select

from ..models import (
    Context,
    Language,
    Source,
    Term,
    TermContext,
    Topic,
    TopicItem,
    Translation,
)


REQUIRED_HEADERS = (
    "序号",
    "专题（专区）",
    "术语名称",
    "术语层级",
    "文化分类",
    "场景分类",
    "筛选标签",
    "英文",
    "法语",
    "俄语",
    "西班牙语",
    "阿拉伯语",
    "日语",
    "文化内涵",
    "来源",
)

LANGUAGE_COLUMNS = {
    "英文": "en",
    "法语": "fr",
    "俄语": "ru",
    "西班牙语": "es",
    "阿拉伯语": "ar",
    "日语": "ja",
}

LANGUAGE_DEFINITIONS = {
    "en": ("英语", "English"),
    "fr": ("法语", "French"),
    "ru": ("俄语", "Russian"),
    "es": ("西班牙语", "Spanish"),
    "ar": ("阿拉伯语", "Arabic"),
    "ja": ("日语", "Japanese"),
}

MASTER_CATALOG_KEY = "master_catalog_2026_11_07"

TOPIC_DEFINITIONS = {
    "徽州文化": ("huizhou-culture", "从徽商、徽州村落与传统技艺中阅读徽州文化。"),
    "长江文化（安徽段）": ("yangtze-culture-anhui", "呈现长江安徽段的地域记忆、物产与文化表达。"),
    "淮河文化": ("huaihe-culture", "沿淮河水系，连接民俗、本草、历史人物与地域表达。"),
    "黄梅戏文化": ("huangmei-opera-culture", "从唱腔、剧目与舞台传统认识黄梅戏文化。"),
    "大运河文化（安徽段）": ("grand-canal-culture-anhui", "追寻大运河安徽段的城镇、交通与文化遗产。"),
    "黄河文化": ("yellow-river-culture", "汇集黄河文明的历史记忆与当代表达。"),
    "社会主义先进文化": ("advanced-socialist-culture", "梳理社会主义先进文化的核心概念与传播表达。"),
    "革命文化": ("revolutionary-culture", "记录革命历史、精神谱系与红色文化表达。"),
    "近现代文化": ("modern-contemporary-culture", "呈现中国近现代社会变迁中的人物、事件与观念。"),
    "中华优秀传统文化": ("excellent-traditional-chinese-culture", "汇聚中华优秀传统文化的概念、技艺与思想资源。"),
}

LIST_SEPARATOR = re.compile(r"\s*[,，、;；]\s*")
WHITESPACE = re.compile(r"\s+")


class CatalogValidationError(ValueError):
    """Raised when a master catalog workbook is incomplete or malformed."""


@dataclass(frozen=True)
class CatalogRow:
    row_number: int
    sequence: int
    topic_name: str
    term_name: str
    term_level: str
    culture_category: str
    scenes: tuple[str, ...]
    tags: tuple[str, ...]
    translations: dict[str, str]
    cultural_connotation: str
    source_text: str
    raw: dict[str, Any]


@dataclass(frozen=True)
class CatalogData:
    rows: tuple[CatalogRow, ...]
    topic_counts: dict[str, int]
    canonical_term_count: int
    duplicate_names: tuple[str, ...]


@dataclass(frozen=True)
class CatalogImportReport:
    source_rows: int
    canonical_terms: int
    topics: int
    translations: int
    topic_items: int
    sources: int
    contexts: int


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    return WHITESPACE.sub(" ", unicodedata.normalize("NFC", str(value))).strip()


def normalize_name(value: Any) -> str:
    return WHITESPACE.sub(" ", unicodedata.normalize("NFKC", str(value or ""))).strip()


def split_labels(value: Any) -> tuple[str, ...]:
    text = normalize_text(value)
    if not text:
        return ()
    return tuple(dict.fromkeys(part for part in LIST_SEPARATOR.split(text) if part))


def _sequence(value: Any, row_number: int) -> int:
    if isinstance(value, bool):
        raise CatalogValidationError(f"第 {row_number} 行的序号不是有效整数")
    try:
        number = int(value)
    except (TypeError, ValueError) as exc:
        raise CatalogValidationError(f"第 {row_number} 行的序号不是有效整数") from exc
    if str(number) != normalize_text(value).removesuffix(".0"):
        raise CatalogValidationError(f"第 {row_number} 行的序号不是有效整数")
    return number


def load_catalog(path: Path) -> CatalogData:
    """Load the ``术语总表`` worksheet without modifying the workbook."""

    workbook_path = Path(path)
    if not workbook_path.is_file():
        raise CatalogValidationError(f"找不到术语总表：{workbook_path}")

    workbook = load_workbook(workbook_path, read_only=True, data_only=True)
    try:
        if "术语总表" not in workbook.sheetnames:
            raise CatalogValidationError("工作簿缺少“术语总表”工作表")
        sheet = workbook["术语总表"]
        header_values = next(sheet.iter_rows(min_row=1, max_row=1, values_only=True), ())
        headers = [normalize_name(value) for value in header_values]
        normalized_headers = {
            normalize_name(header): header for header in REQUIRED_HEADERS
        }
        missing = [
            header
            for normalized, header in normalized_headers.items()
            if normalized not in headers
        ]
        if missing:
            raise CatalogValidationError(f"术语总表缺少必需列：{'、'.join(missing)}")
        indices = {
            header: headers.index(normalized)
            for normalized, header in normalized_headers.items()
        }

        rows: list[CatalogRow] = []
        for row_number, values in enumerate(
            sheet.iter_rows(min_row=2, values_only=True), start=2
        ):
            if not any(normalize_text(value) for value in values):
                continue
            raw = {
                header: values[index] if index < len(values) else None
                for header, index in indices.items()
            }
            for header in REQUIRED_HEADERS:
                if not normalize_text(raw[header]):
                    raise CatalogValidationError(f"第 {row_number} 行的“{header}”不能为空")

            translations = {
                language_code: normalize_text(raw[column])
                for column, language_code in LANGUAGE_COLUMNS.items()
            }
            rows.append(
                CatalogRow(
                    row_number=row_number,
                    sequence=_sequence(raw["序号"], row_number),
                    topic_name=normalize_text(raw["专题（专区）"]),
                    term_name=normalize_name(raw["术语名称"]),
                    term_level=normalize_text(raw["术语层级"]),
                    culture_category=normalize_text(raw["文化分类"]),
                    scenes=split_labels(raw["场景分类"]),
                    tags=split_labels(raw["筛选标签"]),
                    translations=translations,
                    cultural_connotation=normalize_text(raw["文化内涵"]),
                    source_text=normalize_text(raw["来源"]),
                    raw={key: normalize_text(value) for key, value in raw.items()},
                )
            )
    finally:
        workbook.close()

    topic_counts = dict(Counter(row.topic_name for row in rows))
    name_counts = Counter(row.term_name for row in rows)
    duplicates = tuple(sorted(name for name, count in name_counts.items() if count > 1))
    return CatalogData(
        rows=tuple(rows),
        topic_counts=topic_counts,
        canonical_term_count=len(name_counts),
        duplicate_names=duplicates,
    )


def _first_clause(value: str) -> str:
    return re.split(r"[;；]", value, maxsplit=1)[0].strip()


def _context_code(label: str) -> str:
    digest = hashlib.sha1(label.encode("utf-8")).hexdigest()[:16]
    return f"scene-{digest}"


def _group_rows(catalog: CatalogData) -> dict[str, list[CatalogRow]]:
    grouped: dict[str, list[CatalogRow]] = {}
    for row in catalog.rows:
        grouped.setdefault(row.term_name, []).append(row)
    return grouped


def import_master_catalog(session, catalog: CatalogData) -> CatalogImportReport:
    """Upsert the reviewed catalog into the normalized knowledge model.

    The caller owns the transaction. This function flushes so its report is
    accurate, but deliberately never commits.
    """

    unknown_topics = sorted(set(catalog.topic_counts) - set(TOPIC_DEFINITIONS))
    if unknown_topics:
        raise CatalogValidationError(f"尚未配置专题：{'、'.join(unknown_topics)}")

    languages = {item.code: item for item in session.scalars(select(Language))}
    for code, (name_zh, name_en) in LANGUAGE_DEFINITIONS.items():
        language = languages.get(code)
        if language is None:
            language = Language(code=code, name_zh=name_zh, name_en=name_en, enabled=True)
            session.add(language)
            languages[code] = language
        else:
            language.name_zh = name_zh
            language.name_en = name_en
            language.enabled = True

    topics_by_slug = {item.slug: item for item in session.scalars(select(Topic))}
    topics_by_name: dict[str, Topic] = {}
    for topic_name in catalog.topic_counts:
        slug, summary = TOPIC_DEFINITIONS[topic_name]
        topic = topics_by_slug.get(slug)
        if topic is None:
            topic = Topic(slug=slug)
            session.add(topic)
            topics_by_slug[slug] = topic
        topic.title = topic_name
        topic.summary = summary
        topic.status = "published"
        topics_by_name[topic_name] = topic

    session.flush()

    existing_terms: dict[str, Term] = {}
    for term in session.scalars(select(Term).order_by(Term.id)):
        existing_terms.setdefault(normalize_name(term.preferred_name_zh), term)

    terms_by_name: dict[str, Term] = {}
    grouped_rows = _group_rows(catalog)
    for term_name, rows in grouped_rows.items():
        primary = rows[0]
        term = existing_terms.get(term_name)
        if term is None:
            term = Term(
                preferred_name_zh=term_name,
                legacy_table=MASTER_CATALOG_KEY,
                legacy_id=term_name,
            )
            session.add(term)
            existing_terms[term_name] = term
        term.preferred_name_zh = term_name
        term.definition_zh = _first_clause(primary.cultural_connotation)
        term.cultural_connotation = primary.cultural_connotation
        term.term_level = primary.term_level
        term.culture_category = primary.culture_category
        term.status = "published"
        term.data_quality = "curated"
        payload = dict(term.legacy_payload or {})
        payload[MASTER_CATALOG_KEY] = {
            "rows": [row.raw for row in rows],
            "topics": list(dict.fromkeys(row.topic_name for row in rows)),
            "tags": list(dict.fromkeys(tag for row in rows for tag in row.tags)),
        }
        term.legacy_payload = payload
        terms_by_name[term_name] = term

    session.flush()

    for term_name, rows in grouped_rows.items():
        term = terms_by_name[term_name]
        translations_by_language: dict[int, list[Translation]] = {}
        for translation in term.translations:
            translations_by_language.setdefault(translation.language_id, []).append(translation)
        for code in LANGUAGE_DEFINITIONS:
            language = languages[code]
            values = list(
                dict.fromkeys(
                    normalize_text(row.translations[code])
                    for row in rows
                    if normalize_text(row.translations[code])
                )
            )
            existing = translations_by_language.setdefault(language.id, [])
            by_text = {normalize_text(item.text): item for item in existing}
            for item in existing:
                if item.translation_type == "recommended":
                    item.translation_type = "acceptable"
            for index, value in enumerate(values):
                translation = by_text.get(value)
                if translation is None:
                    translation = Translation(term=term, language=language, text=value)
                    session.add(translation)
                    existing.append(translation)
                    by_text[value] = translation
                translation.translation_type = "recommended" if index == 0 else "acceptable"
                translation.authority_level = "reviewed"
                translation.review_status = "reviewed"

    sources_by_citation = {
        normalize_text(item.citation): item
        for item in session.scalars(select(Source))
        if item.citation
    }
    contexts_by_code = {item.code: item for item in session.scalars(select(Context))}
    catalog_source_citations: set[str] = set()
    catalog_context_codes: set[str] = set()
    for row in catalog.rows:
        term = terms_by_name[row.term_name]
        citation = row.source_text
        catalog_source_citations.add(citation)
        source = sources_by_citation.get(citation)
        if source is None:
            source = Source(
                title=_first_clause(citation)[:255],
                source_type="curated_reference",
                citation=citation,
                authority_level="reviewed",
                legacy_value=citation[:255],
            )
            session.add(source)
            sources_by_citation[citation] = source
        if source not in term.sources:
            term.sources.append(source)

        for scene in row.scenes:
            code = _context_code(scene)
            catalog_context_codes.add(code)
            context = contexts_by_code.get(code)
            if context is None:
                context = Context(
                    code=code,
                    name_zh=scene,
                    audience="公众",
                    style="专题场景",
                    description=f"适用于{scene}相关表达。",
                )
                session.add(context)
                contexts_by_code[code] = context
            if not any(link.context is context for link in term.contexts):
                session.add(TermContext(term=term, context=context))

    session.flush()

    existing_items: dict[tuple[int, int], list[TopicItem]] = {}
    for item in session.scalars(select(TopicItem).order_by(TopicItem.id)):
        if item.term_id is not None:
            existing_items.setdefault((item.topic_id, item.term_id), []).append(item)

    desired_item_ids: set[int] = set()
    for row in catalog.rows:
        topic = topics_by_name[row.topic_name]
        term = terms_by_name[row.term_name]
        key = (topic.id, term.id)
        matches = existing_items.get(key, [])
        if matches:
            item = matches[0]
            for duplicate in matches[1:]:
                session.delete(duplicate)
        else:
            item = TopicItem(topic=topic, term=term)
            session.add(item)
            session.flush()
            existing_items[key] = [item]
        item.entry_type = "term"
        item.title = term.preferred_name_zh
        item.payload = {"catalog_row": row.raw, "tags": list(row.tags)}
        item.legacy_table = MASTER_CATALOG_KEY
        item.legacy_id = str(row.sequence)
        desired_item_ids.add(item.id)

    for item in session.scalars(
        select(TopicItem).where(TopicItem.legacy_table == MASTER_CATALOG_KEY)
    ):
        if item.id not in desired_item_ids:
            session.delete(item)

    session.flush()
    return CatalogImportReport(
        source_rows=len(catalog.rows),
        canonical_terms=len(terms_by_name),
        topics=len(topics_by_name),
        translations=session.query(Translation).filter(
            Translation.term_id.in_([term.id for term in terms_by_name.values()])
        ).count(),
        topic_items=len(desired_item_ids),
        sources=len(catalog_source_citations),
        contexts=len(catalog_context_codes),
    )
