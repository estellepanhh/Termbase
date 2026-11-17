"""Read and validate the reviewed multilingual master catalog workbook."""

from __future__ import annotations

import re
import hashlib
import unicodedata
from collections import Counter
from dataclasses import dataclass, replace
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
    TermRelation,
    TermSubmission,
    Topic,
    TopicItem,
    Translation,
    ReviewCaseTerm,
)


REQUIRED_HEADERS = (
    "序号",
    "专题（专区）",
    "术语名称",
    "术语层级",
    "文化分类",
    "筛选标签",
    "英文",
    "法语",
    "俄语",
    "西班牙语",
    "阿拉伯语",
    "日语",
    "文化内涵",
    "来源",
    "儿童版解释",
    "场景标签",
    "释义条数",
)

DEFINITION_HEADERS = (
    "序号", "专题（专区）", "术语名称", "第几条", "释义内容", "来源记录ID", "来源分类",
)

SCENE_DETAIL_HEADERS = (
    "序号", "专题（专区）", "术语名称", "场景名称", "受众", "场景说明", "例句", "扩展解释", "类型",
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

MASTER_CATALOG_KEY = "master_catalog_2026_11_17"
PREVIOUS_MASTER_CATALOG_KEYS = (
    "master_catalog_2026_11_11",
    "master_catalog_2026_11_07",
)
MANAGED_MASTER_CATALOG_KEYS = (MASTER_CATALOG_KEY, *PREVIOUS_MASTER_CATALOG_KEYS)

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
    child_explanation: str
    definition_count: int
    definitions: tuple["DefinitionDetail", ...]
    scene_details: tuple["SceneDetail", ...]
    raw: dict[str, Any]


@dataclass(frozen=True)
class DefinitionDetail:
    row_number: int
    position: int
    content: str
    source_record_id: str
    source_category: str
    raw: dict[str, Any]


@dataclass(frozen=True)
class SceneDetail:
    row_number: int
    name: str
    audience: str
    description: str
    example: str
    extended_explanation: str
    kind: str
    raw: dict[str, Any]


@dataclass(frozen=True)
class CatalogData:
    rows: tuple[CatalogRow, ...]
    topic_counts: dict[str, int]
    canonical_term_count: int
    duplicate_names: tuple[str, ...]
    definition_count: int
    scene_detail_count: int


@dataclass(frozen=True)
class CatalogImportReport:
    source_rows: int
    term_records: int
    canonical_terms: int
    definitions: int
    scene_details: int
    topics: int
    translations: int
    topic_items: int
    sources: int
    contexts: int


@dataclass(frozen=True)
class TermClearReport:
    terms: int
    topic_items: int
    review_links: int
    relations: int
    submissions_unlinked: int
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


def _required_indices(sheet, *, header_row: int, required_headers: tuple[str, ...]):
    header_values = next(
        sheet.iter_rows(min_row=header_row, max_row=header_row, values_only=True), ()
    )
    headers = [normalize_name(value) for value in header_values]
    missing = [header for header in required_headers if normalize_name(header) not in headers]
    if missing:
        raise CatalogValidationError(
            f"工作表“{sheet.title}”缺少必需列：{'、'.join(missing)}"
        )
    return headers, {
        header: headers.index(normalize_name(header)) for header in required_headers
    }


def _raw_row(headers: list[str], values: tuple[Any, ...]) -> dict[str, Any]:
    return {
        header: values[index] if index < len(values) else None
        for index, header in enumerate(headers)
        if header
    }


def load_catalog(path: Path) -> CatalogData:
    """Load and cross-check all three worksheets without modifying them."""

    workbook_path = Path(path)
    if not workbook_path.is_file():
        raise CatalogValidationError(f"找不到术语总表：{workbook_path}")

    workbook = load_workbook(workbook_path, read_only=True, data_only=True)
    try:
        for sheet_name in ("术语总表", "释义明细", "场景明细"):
            if sheet_name not in workbook.sheetnames:
                raise CatalogValidationError(f"工作簿缺少“{sheet_name}”工作表")
        sheet = workbook["术语总表"]
        headers, indices = _required_indices(
            sheet, header_row=1, required_headers=REQUIRED_HEADERS
        )

        rows: list[CatalogRow] = []
        rows_by_sequence: dict[int, CatalogRow] = {}
        for row_number, values in enumerate(
            sheet.iter_rows(min_row=2, values_only=True), start=2
        ):
            if not any(normalize_text(value) for value in values):
                continue
            required = {
                header: values[index] if index < len(values) else None
                for header, index in indices.items()
            }
            for header in REQUIRED_HEADERS:
                if not normalize_text(required[header]):
                    raise CatalogValidationError(f"第 {row_number} 行的“{header}”不能为空")

            translations = {
                language_code: normalize_text(required[column])
                for column, language_code in LANGUAGE_COLUMNS.items()
            }
            sequence = _sequence(required["序号"], row_number)
            if sequence in rows_by_sequence:
                raise CatalogValidationError(f"术语总表存在重复序号：{sequence}")
            row = CatalogRow(
                row_number=row_number,
                sequence=sequence,
                topic_name=normalize_text(required["专题（专区）"]),
                term_name=normalize_name(required["术语名称"]),
                term_level=normalize_text(required["术语层级"]),
                culture_category=normalize_text(required["文化分类"]),
                scenes=split_labels(required["场景标签"]),
                tags=split_labels(required["筛选标签"]),
                translations=translations,
                cultural_connotation=normalize_text(required["文化内涵"]),
                source_text=normalize_text(required["来源"]),
                child_explanation=normalize_text(required["儿童版解释"]),
                definition_count=_sequence(required["释义条数"], row_number),
                definitions=(),
                scene_details=(),
                raw=_raw_row(headers, values),
            )
            rows.append(row)
            rows_by_sequence[sequence] = row

        definitions_by_sequence: dict[int, list[DefinitionDetail]] = {
            sequence: [] for sequence in rows_by_sequence
        }
        definition_sheet = workbook["释义明细"]
        definition_headers, definition_indices = _required_indices(
            definition_sheet, header_row=3, required_headers=DEFINITION_HEADERS
        )
        seen_definition_positions: set[tuple[int, int]] = set()
        for row_number, values in enumerate(
            definition_sheet.iter_rows(min_row=4, values_only=True), start=4
        ):
            if not any(normalize_text(value) for value in values):
                continue
            raw = _raw_row(definition_headers, values)
            sequence = _sequence(values[definition_indices["序号"]], row_number)
            main_row = rows_by_sequence.get(sequence)
            if main_row is None:
                raise CatalogValidationError(f"释义明细第 {row_number} 行引用未知序号：{sequence}")
            position = _sequence(values[definition_indices["第几条"]], row_number)
            key = (sequence, position)
            if key in seen_definition_positions:
                raise CatalogValidationError(f"释义明细存在重复序号和条次：{sequence}/{position}")
            seen_definition_positions.add(key)
            topic_name = normalize_text(values[definition_indices["专题（专区）"]])
            term_name = normalize_name(values[definition_indices["术语名称"]])
            content = normalize_text(values[definition_indices["释义内容"]])
            if (topic_name, term_name) != (main_row.topic_name, main_row.term_name):
                raise CatalogValidationError(f"释义明细第 {row_number} 行与术语总表不一致")
            if not content:
                raise CatalogValidationError(f"释义明细第 {row_number} 行的“释义内容”不能为空")
            definitions_by_sequence[sequence].append(DefinitionDetail(
                row_number=row_number,
                position=position,
                content=content,
                source_record_id=normalize_text(values[definition_indices["来源记录ID"]]),
                source_category=normalize_text(values[definition_indices["来源分类"]]),
                raw=raw,
            ))

        scenes_by_sequence: dict[int, list[SceneDetail]] = {
            sequence: [] for sequence in rows_by_sequence
        }
        scene_sheet = workbook["场景明细"]
        scene_headers, scene_indices = _required_indices(
            scene_sheet, header_row=3, required_headers=SCENE_DETAIL_HEADERS
        )
        for row_number, values in enumerate(
            scene_sheet.iter_rows(min_row=4, values_only=True), start=4
        ):
            if not any(normalize_text(value) for value in values):
                continue
            raw = _raw_row(scene_headers, values)
            sequence = _sequence(values[scene_indices["序号"]], row_number)
            main_row = rows_by_sequence.get(sequence)
            if main_row is None:
                raise CatalogValidationError(f"场景明细第 {row_number} 行引用未知序号：{sequence}")
            topic_name = normalize_text(values[scene_indices["专题（专区）"]])
            term_name = normalize_name(values[scene_indices["术语名称"]])
            name = normalize_text(values[scene_indices["场景名称"]])
            if (topic_name, term_name) != (main_row.topic_name, main_row.term_name):
                raise CatalogValidationError(f"场景明细第 {row_number} 行与术语总表不一致")
            if not name:
                raise CatalogValidationError(f"场景明细第 {row_number} 行的“场景名称”不能为空")
            scenes_by_sequence[sequence].append(SceneDetail(
                row_number=row_number,
                name=name,
                audience=normalize_text(values[scene_indices["受众"]]),
                description=normalize_text(values[scene_indices["场景说明"]]),
                example=normalize_text(values[scene_indices["例句"]]),
                extended_explanation=normalize_text(values[scene_indices["扩展解释"]]),
                kind=normalize_text(values[scene_indices["类型"]]),
                raw=raw,
            ))

        completed_rows = []
        for row in rows:
            definitions = tuple(sorted(
                definitions_by_sequence[row.sequence], key=lambda item: item.position
            ))
            if len(definitions) != row.definition_count:
                raise CatalogValidationError(
                    f"序号 {row.sequence} 的释义条数声明为 {row.definition_count}，实际为 {len(definitions)}"
                )
            scene_details = tuple(scenes_by_sequence[row.sequence])
            if not scene_details:
                raise CatalogValidationError(f"序号 {row.sequence} 缺少场景明细")
            completed_rows.append(replace(
                row, definitions=definitions, scene_details=scene_details
            ))
        rows = completed_rows
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
        definition_count=sum(len(row.definitions) for row in rows),
        scene_detail_count=sum(len(row.scene_details) for row in rows),
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


def _prior_catalog_values(term: Term) -> tuple[dict[str, set[str]], set[str], set[str]]:
    translations = {code: set() for code in LANGUAGE_DEFINITIONS}
    sources: set[str] = set()
    scenes: set[str] = set()
    payload = term.legacy_payload or {}
    for key in MANAGED_MASTER_CATALOG_KEYS:
        archive = payload.get(key) or {}
        for row in archive.get("rows") or []:
            for column, code in LANGUAGE_COLUMNS.items():
                value = normalize_text(row.get(column))
                if value:
                    translations[code].add(value)
            source = normalize_text(row.get("来源"))
            if source:
                sources.add(source)
            scenes.update(split_labels(row.get("场景分类")))
    return translations, sources, scenes


def _legacy_import_master_catalog(session, catalog: CatalogData) -> CatalogImportReport:
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
    prior_values_by_name: dict[str, tuple[dict[str, set[str]], set[str], set[str]]] = {}
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
        prior_values_by_name[term_name] = _prior_catalog_values(term)
        term.preferred_name_zh = term_name
        term.definition_zh = _first_clause(primary.cultural_connotation)
        term.cultural_connotation = primary.cultural_connotation
        term.term_level = primary.term_level
        term.culture_category = primary.culture_category
        term.status = "published"
        term.data_quality = "curated"
        payload = dict(term.legacy_payload or {})
        for previous_key in PREVIOUS_MASTER_CATALOG_KEYS:
            payload.pop(previous_key, None)
        payload[MASTER_CATALOG_KEY] = {
            "rows": [row.raw for row in rows],
            "topics": list(dict.fromkeys(row.topic_name for row in rows)),
            "tags": list(dict.fromkeys(tag for row in rows for tag in row.tags)),
        }
        term.legacy_payload = payload
        if term.legacy_table in MANAGED_MASTER_CATALOG_KEYS:
            term.legacy_table = MASTER_CATALOG_KEY
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
            desired_values = set(values)
            prior_values = prior_values_by_name[term_name][0][code]
            for item in list(existing):
                if normalize_text(item.text) in prior_values - desired_values:
                    session.delete(item)
                    existing.remove(item)
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

    for term_name, rows in grouped_rows.items():
        term = terms_by_name[term_name]
        _, prior_sources, prior_scenes = prior_values_by_name[term_name]
        desired_sources = {row.source_text for row in rows}
        desired_scenes = {scene for row in rows for scene in row.scenes}
        term.sources[:] = [
            source for source in term.sources
            if normalize_text(source.citation) not in prior_sources - desired_sources
        ]
        for link in list(term.contexts):
            if link.context and link.context.name_zh in prior_scenes - desired_scenes:
                session.delete(link)

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
        select(TopicItem).where(TopicItem.legacy_table.in_(MANAGED_MASTER_CATALOG_KEYS))
    ):
        if item.id not in desired_item_ids:
            session.delete(item)

    session.flush()
    return CatalogImportReport(
        source_rows=len(catalog.rows),
        term_records=len(terms_by_name),
        canonical_terms=len(terms_by_name),
        definitions=catalog.definition_count,
        scene_details=catalog.scene_detail_count,
        topics=len(topics_by_name),
        translations=session.query(Translation).filter(
            Translation.term_id.in_([term.id for term in terms_by_name.values()])
        ).count(),
        topic_items=len(desired_item_ids),
        sources=len(catalog_source_citations),
        contexts=len(catalog_context_codes),
    )


def clear_term_catalog(session) -> TermClearReport:
    """Remove every term-owned record while preserving topics and materials."""

    terms = list(session.scalars(select(Term)))
    topic_item_count = session.query(TopicItem).filter(
        (TopicItem.term_id.is_not(None)) | (TopicItem.entry_type == "term")
    ).count()
    review_link_count = session.query(ReviewCaseTerm).count()
    relation_count = session.query(TermRelation).count()
    submission_count = session.query(TermSubmission).filter(
        TermSubmission.term_id.is_not(None)
    ).count()
    sources = list(session.scalars(select(Source)))
    contexts = list(session.scalars(select(Context)))

    # These association rows use composite primary keys and their Term-side
    # relationships do not own them. Delete them in bulk before ORM-deleting
    # Term objects so SQLAlchemy never tries to null a primary-key foreign key.
    session.query(ReviewCaseTerm).delete(synchronize_session=False)
    session.query(TermRelation).delete(synchronize_session=False)
    session.query(TermSubmission).filter(
        TermSubmission.term_id.is_not(None)
    ).update({TermSubmission.term_id: None}, synchronize_session=False)
    session.query(TopicItem).filter(
        (TopicItem.term_id.is_not(None)) | (TopicItem.entry_type == "term")
    ).delete(synchronize_session=False)
    session.flush()
    session.expire_all()
    for term in terms:
        session.delete(term)
    session.flush()
    for source in sources:
        session.delete(source)
    for context in contexts:
        session.delete(context)
    session.flush()

    return TermClearReport(
        terms=len(terms),
        topic_items=topic_item_count,
        review_links=review_link_count,
        relations=relation_count,
        submissions_unlinked=submission_count,
        sources=len(sources),
        contexts=len(contexts),
    )


def _scene_detail_for_label(row: CatalogRow, label: str) -> SceneDetail | None:
    matches = [item for item in row.scene_details if item.name == label]
    if not matches:
        return None
    return next(
        (
            item for item in matches
            if item.audience or item.description or item.example
            or item.extended_explanation or item.kind
        ),
        matches[0],
    )


def import_master_catalog(session, catalog: CatalogData) -> CatalogImportReport:
    """Reconcile one database term and topic item for every workbook sequence."""

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

    existing_terms = {
        str(item.legacy_id): item
        for item in session.scalars(
            select(Term).where(Term.legacy_table.in_(MANAGED_MASTER_CATALOG_KEYS))
        )
        if item.legacy_id is not None
    }
    existing_items = {
        str(item.legacy_id): item
        for item in session.scalars(
            select(TopicItem).where(
                TopicItem.legacy_table.in_(MANAGED_MASTER_CATALOG_KEYS),
                TopicItem.entry_type == "term",
            )
        )
        if item.legacy_id is not None
    }
    sources_by_citation = {
        normalize_text(item.citation): item
        for item in session.scalars(select(Source))
        if item.citation
    }
    contexts_by_code = {item.code: item for item in session.scalars(select(Context))}
    selected_terms: list[Term] = []
    selected_term_ids: set[int] = set()
    selected_item_ids: set[int] = set()
    catalog_source_citations: set[str] = set()
    catalog_context_codes: set[str] = set()

    for row in catalog.rows:
        legacy_id = str(row.sequence)
        term = existing_terms.get(legacy_id)
        if term is None:
            term = Term(
                preferred_name_zh=row.term_name,
                legacy_table=MASTER_CATALOG_KEY,
                legacy_id=legacy_id,
            )
            session.add(term)
            session.flush()
            existing_terms[legacy_id] = term
        else:
            for translation in list(term.translations):
                session.delete(translation)
            for link in list(term.contexts):
                session.delete(link)
            term.sources.clear()
            session.flush()

        primary_definition = row.definitions[0].content
        term.preferred_name_zh = row.term_name
        term.definition_zh = _first_clause(primary_definition)
        term.cultural_connotation = primary_definition
        term.term_level = row.term_level
        term.culture_category = row.culture_category
        term.status = "published"
        term.data_quality = "curated"
        term.legacy_table = MASTER_CATALOG_KEY
        term.legacy_id = legacy_id
        term.legacy_payload = {
            MASTER_CATALOG_KEY: {
                "catalog_row": row.raw,
                "definition_details": [item.raw for item in row.definitions],
                "scene_details": [item.raw for item in row.scene_details],
                "tags": list(row.tags),
            }
        }

        for code, language in languages.items():
            if code not in LANGUAGE_DEFINITIONS:
                continue
            session.add(Translation(
                term=term,
                language=language,
                text=row.translations[code],
                translation_type="recommended",
                authority_level="reviewed",
                review_status="reviewed",
            ))

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
        term.sources.append(source)

        scene_labels = list(row.scenes)
        if "儿童" not in scene_labels:
            scene_labels.append("儿童")
        for label in scene_labels:
            detail = _scene_detail_for_label(row, label)
            code = "children" if label == "儿童" else _context_code(label)
            catalog_context_codes.add(code)
            context = contexts_by_code.get(code)
            if context is None:
                context = Context(
                    code=code,
                    name_zh=label,
                    audience=(detail.audience if detail else "") or ("children" if code == "children" else "公众"),
                    style=(detail.kind if detail else "") or ("通俗" if code == "children" else "专题场景"),
                    description=(detail.description if detail else "") or f"适用于{label}相关表达。",
                )
                session.add(context)
                contexts_by_code[code] = context
            session.add(TermContext(
                term=term,
                context=context,
                explanation=(
                    row.child_explanation if code == "children"
                    else ((detail.extended_explanation or detail.description) if detail else "")
                ),
                example=(detail.example if detail else ""),
                note=(detail.kind if detail and detail.kind else None),
            ))

        topic = topics_by_name[row.topic_name]
        item = existing_items.get(legacy_id)
        if item is None:
            item = TopicItem(topic=topic)
            session.add(item)
            session.flush()
            existing_items[legacy_id] = item
        item.topic = topic
        item.term = term
        item.entry_type = "term"
        item.title = row.term_name
        item.payload = {"catalog_row": row.raw, "tags": list(row.tags)}
        item.legacy_table = MASTER_CATALOG_KEY
        item.legacy_id = legacy_id
        session.flush()
        selected_terms.append(term)
        selected_term_ids.add(term.id)
        selected_item_ids.add(item.id)

    for item in list(session.scalars(
        select(TopicItem).where(
            TopicItem.legacy_table.in_(MANAGED_MASTER_CATALOG_KEYS),
            TopicItem.entry_type == "term",
        )
    )):
        if item.id not in selected_item_ids:
            session.delete(item)
    for term in list(session.scalars(
        select(Term).where(Term.legacy_table.in_(MANAGED_MASTER_CATALOG_KEYS))
    )):
        if term.id not in selected_term_ids:
            session.delete(term)
    session.flush()

    return CatalogImportReport(
        source_rows=len(catalog.rows),
        term_records=len(selected_terms),
        canonical_terms=catalog.canonical_term_count,
        definitions=catalog.definition_count,
        scene_details=catalog.scene_detail_count,
        topics=len(topics_by_name),
        translations=session.query(Translation).filter(
            Translation.term_id.in_([term.id for term in selected_terms])
        ).count(),
        topic_items=len(selected_item_ids),
        sources=len(catalog_source_citations),
        contexts=len(catalog_context_codes),
    )
