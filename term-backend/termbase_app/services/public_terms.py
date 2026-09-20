from sqlalchemy import or_
from sqlalchemy.orm import selectinload

from ..extensions import db
from ..models import (
    Language,
    Term,
    TermContext,
    TermEvidence,
    TermRelation,
    TopicItem,
    Translation,
    TranslationContext,
)


def list_published_terms(*, q="", level="", culture="", language="", page=1, page_size=20):
    page = max(1, page)
    page_size = min(100, max(1, page_size))
    stmt = (
        db.select(Term)
        .where(Term.status == "published")
        .options(
            selectinload(Term.translations).selectinload(Translation.language),
            selectinload(Term.sources),
            selectinload(Term.contexts).selectinload(TermContext.context),
        )
    )
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(or_(Term.preferred_name_zh.like(pattern), Term.definition_zh.like(pattern)))
    if level:
        stmt = stmt.where(Term.term_level == level)
    if culture:
        stmt = stmt.where(Term.culture_category == culture)
    if language:
        stmt = (
            stmt.join(Term.translations)
            .join(Translation.language)
            .where(Language.code == language)
            .distinct()
        )
    return db.paginate(stmt.order_by(Term.id), page=page, per_page=page_size, error_out=False)


def get_published_term(term_id):
    stmt = (
        db.select(Term)
        .where(Term.id == term_id, Term.status == "published")
        .options(
            selectinload(Term.translations).selectinload(Translation.language),
            selectinload(Term.translations)
            .selectinload(Translation.contexts)
            .selectinload(TranslationContext.context),
            selectinload(Term.sources),
            selectinload(Term.names),
            selectinload(Term.evidence).selectinload(TermEvidence.source),
            selectinload(Term.contexts).selectinload(TermContext.context),
            selectinload(Term.cultural_notes),
            selectinload(Term.outgoing_relations).selectinload(TermRelation.target_term),
            selectinload(Term.incoming_relations).selectinload(TermRelation.source_term),
            selectinload(Term.topic_items).selectinload(TopicItem.topic),
        )
    )
    return db.session.scalar(stmt)


def serialize_term_summary(term):
    translations = sorted(term.translations, key=lambda item: item.id)
    recommended = next(
        (item for item in translations if item.translation_type == "recommended"), None
    )
    child_context = next((item for item in term.contexts if item.context.code == "children"), None)
    return {
        "id": term.id,
        "preferred_name_zh": term.preferred_name_zh,
        "definition_zh": term.definition_zh,
        "child_explanation": child_context.explanation if child_context else None,
        "term_level": term.term_level,
        "culture_category": term.culture_category,
        "data_quality": term.data_quality,
        "recommended_translation": (
            serialize_translation_summary(recommended) if recommended else None
        ),
        "language_count": len({item.language_id for item in translations}),
        "source_count": len(term.sources),
    }


def serialize_term_detail(term):
    result = serialize_term_summary(term)
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
        "payload": item.payload,
    }
