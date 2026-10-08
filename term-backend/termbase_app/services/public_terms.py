from dataclasses import dataclass
import unicodedata

from sqlalchemy.orm import selectinload

from ..extensions import db
from ..models import (
    Term,
    TermContext,
    TermEvidence,
    TermRelation,
    TopicItem,
    Translation,
    TranslationContext,
)


@dataclass(frozen=True)
class CanonicalTerm:
    primary: Term
    records: tuple[Term, ...]

    def __getattr__(self, name):
        return getattr(self.primary, name)


@dataclass(frozen=True)
class CanonicalPage:
    items: list[CanonicalTerm]
    page: int
    per_page: int
    total: int


def list_published_terms(*, q="", level="", culture="", language="", page=1, page_size=20):
    page = max(1, page)
    page_size = min(100, max(1, page_size))
    records = _load_published_terms(detail=False)
    matching_keys = {
        _canonical_name(term.preferred_name_zh)
        for term in records
        if _matches_filters(term, q=q, level=level, culture=culture, language=language)
    }
    groups = _canonical_groups(records, matching_keys)
    start = (page - 1) * page_size
    return CanonicalPage(
        items=groups[start:start + page_size],
        page=page,
        per_page=page_size,
        total=len(groups),
    )


def get_published_term(term_id):
    records = _load_published_terms(detail=True)
    selected = next((term for term in records if term.id == term_id), None)
    if selected is None:
        return None
    key = _canonical_name(selected.preferred_name_zh)
    return _canonical_groups(records, {key})[0]


def _load_published_terms(*, detail):
    options = [
        selectinload(Term.translations).selectinload(Translation.language),
        selectinload(Term.sources),
        selectinload(Term.contexts).selectinload(TermContext.context),
    ]
    if detail:
        options.extend([
            selectinload(Term.translations)
            .selectinload(Translation.contexts)
            .selectinload(TranslationContext.context),
            selectinload(Term.names),
            selectinload(Term.evidence).selectinload(TermEvidence.source),
            selectinload(Term.cultural_notes),
            selectinload(Term.outgoing_relations).selectinload(TermRelation.target_term),
            selectinload(Term.incoming_relations).selectinload(TermRelation.source_term),
            selectinload(Term.topic_items).selectinload(TopicItem.topic),
        ])
    stmt = (
        db.select(Term)
        .where(Term.status == "published")
        .options(*options)
        .order_by(Term.id)
    )
    return list(db.session.scalars(stmt).unique())


def _canonical_name(value):
    return unicodedata.normalize("NFKC", value or "").strip().casefold()


def _normalized_text(value):
    return " ".join(unicodedata.normalize("NFKC", value or "").split()).casefold()


def _matches_filters(term, *, q, level, culture, language):
    query = _normalized_text(q)
    if query and query not in _normalized_text(term.preferred_name_zh) and query not in _normalized_text(term.definition_zh):
        return False
    if level and term.term_level != level:
        return False
    if culture and term.culture_category != culture:
        return False
    if language and not any(item.language.code == language for item in term.translations):
        return False
    return True


def _canonical_groups(records, matching_keys):
    grouped = {}
    for term in records:
        key = _canonical_name(term.preferred_name_zh)
        if key in matching_keys:
            grouped.setdefault(key, []).append(term)
    return [
        CanonicalTerm(primary=group[0], records=tuple(group))
        for group in sorted(grouped.values(), key=lambda items: items[0].id)
    ]


def serialize_term_summary(term):
    canonical = _as_canonical(term)
    translations = sorted(
        (item for record in canonical.records for item in record.translations),
        key=lambda item: item.id,
    )
    recommended = next(
        (item for item in translations if item.translation_type == "recommended"), None
    )
    child_context = next(
        (
            item
            for record in canonical.records
            for item in record.contexts
            if item.context.code == "children"
        ),
        None,
    )
    interpretations = serialize_interpretations(canonical.records)
    return {
        "id": canonical.primary.id,
        "preferred_name_zh": canonical.primary.preferred_name_zh,
        "definition_zh": canonical.primary.definition_zh,
        "child_explanation": child_context.explanation if child_context else None,
        "term_level": canonical.primary.term_level,
        "culture_category": canonical.primary.culture_category,
        "data_quality": canonical.primary.data_quality,
        "recommended_translation": (
            serialize_translation_summary(recommended) if recommended else None
        ),
        "language_count": len({item.language_id for item in translations}),
        "source_count": len({source.id for record in canonical.records for source in record.sources}),
        "interpretation_count": len(interpretations),
        "record_count": len(canonical.records),
    }


def serialize_term_detail(term):
    canonical = _as_canonical(term)
    term = canonical.primary
    result = serialize_term_summary(canonical)
    evidence_by_source_id = {}
    for evidence in sorted(term.evidence, key=lambda item: item.id):
        evidence_by_source_id.setdefault(evidence.source_id, []).append({
            "id": evidence.id,
            "translation_id": evidence.translation_id,
            "original_excerpt": evidence.original_excerpt,
            "translated_excerpt": evidence.translated_excerpt,
            "locator": evidence.locator,
            "note": evidence.note,
        })
    result.update({
        "cultural_connotation": term.cultural_connotation,
        "interpretations": serialize_interpretations(canonical.records),
        "names": [
            {"name": item.name, "name_type": item.name_type}
            for item in sorted(term.names, key=lambda item: item.id)
        ],
        "translations": [
            serialize_translation_detail(item)
            for item in sorted(term.translations, key=lambda item: item.id)
        ],
        "sources": [
            serialize_source(item, evidence_by_source_id.get(item.id, []))
            for item in sorted(term.sources, key=lambda item: item.id)
        ],
        "contexts": [
            serialize_term_context(item)
            for item in sorted(term.contexts, key=lambda item: item.context_id)
        ],
        "cultural_notes": [
            serialize_cultural_note(item)
            for item in sorted(term.cultural_notes, key=lambda item: item.id)
        ],
        "relations": serialize_relations(term),
        "topics": [
            serialize_topic(item)
            for item in sorted(term.topic_items, key=lambda item: item.id)
            if item.topic.status == "published"
        ],
    })
    return result


def _as_canonical(term):
    if isinstance(term, CanonicalTerm):
        return term
    return CanonicalTerm(primary=term, records=(term,))


def serialize_interpretations(records):
    interpretations = []
    seen = set()
    for record in sorted(records, key=lambda item: item.id):
        explanation = record.cultural_connotation.strip() or record.definition_zh.strip()
        key = _normalized_text(explanation)
        if not key or key in seen:
            continue
        seen.add(key)
        interpretations.append({
            "index": len(interpretations) + 1,
            "title": record.culture_category.strip() or f"文化内涵 {len(interpretations) + 1}",
            "explanation": explanation,
            "definition_zh": record.definition_zh,
            "cultural_connotation": record.cultural_connotation,
            "term_level": record.term_level,
            "culture_category": record.culture_category,
            "record_id": record.id,
        })
    return interpretations


def serialize_translation_summary(translation):
    return {
        "language_code": translation.language.code,
        "language_name_zh": translation.language.name_zh,
        "text": translation.text,
        "translation_type": translation.translation_type,
        "authority_level": translation.authority_level,
        "review_status": translation.review_status,
    }


def serialize_translation_detail(translation):
    result = serialize_translation_summary(translation)
    result.update({
        "region": translation.region,
        "note": translation.note,
        "contexts": [
            serialize_translation_context(item)
            for item in sorted(translation.contexts, key=lambda item: item.context_id)
        ],
    })
    return result


def serialize_source(source, evidence):
    return {
        "id": source.id,
        "title": source.title,
        "organization": source.organization,
        "published_at": source.published_at.isoformat() if source.published_at else None,
        "language_code": source.language_code,
        "source_type": source.source_type,
        "url": source.url,
        "citation": source.citation,
        "authority_level": source.authority_level,
        "summary": source.summary,
        "legacy_value": source.legacy_value,
        "evidence": evidence,
    }


def serialize_term_context(term_context):
    return {
        "context_code": term_context.context.code,
        "context_name_zh": term_context.context.name_zh,
        "audience": term_context.context.audience,
        "style": term_context.context.style,
        "description": term_context.context.description,
        "explanation": term_context.explanation,
        "example": term_context.example,
        "note": term_context.note,
    }


def serialize_translation_context(translation_context):
    return {
        "context_code": translation_context.context.code,
        "context_name_zh": translation_context.context.name_zh,
        "audience": translation_context.context.audience,
        "style": translation_context.context.style,
        "description": translation_context.context.description,
        "recommendation_level": translation_context.recommendation_level,
        "example": translation_context.example,
        "note": translation_context.note,
    }


def serialize_cultural_note(note):
    return {
        "target_culture": note.target_culture,
        "difference_summary": note.difference_summary,
        "literal_risk": note.literal_risk,
        "misconception": note.misconception,
        "recommendation": note.recommendation,
    }


def serialize_relations(term):
    outgoing = [
        {
            "direction": "outgoing",
            "relation_type": item.relation_type,
            "source_term_id": item.source_term_id,
            "source_term_name_zh": term.preferred_name_zh,
            "target_term_id": item.target_term_id,
            "target_term_name_zh": item.target_term.preferred_name_zh,
        }
        for item in sorted(
            term.outgoing_relations,
            key=lambda item: (item.target_term_id, item.relation_type),
        )
        if item.target_term.status == "published"
    ]
    incoming = [
        {
            "direction": "incoming",
            "relation_type": item.relation_type,
            "source_term_id": item.source_term_id,
            "source_term_name_zh": item.source_term.preferred_name_zh,
            "target_term_id": item.target_term_id,
            "target_term_name_zh": term.preferred_name_zh,
        }
        for item in sorted(
            term.incoming_relations,
            key=lambda item: (item.source_term_id, item.relation_type),
        )
        if item.source_term.status == "published"
    ]
    return outgoing + incoming


def serialize_topic(item):
    return {
        "slug": item.topic.slug,
        "title": item.topic.title,
        "summary": item.topic.summary,
        "entry_type": item.entry_type,
        "item_title": item.title,
    }
