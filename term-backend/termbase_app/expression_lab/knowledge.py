from __future__ import annotations

import json
from dataclasses import dataclass, replace

from sqlalchemy.orm import selectinload

from ..extensions import db
from ..models import (
    Term,
    TermContext,
    TermEvidence,
    TermRelation,
    Translation,
    TranslationContext,
)
from .contracts import KnowledgePack, KnowledgeSummary, KnowledgeTermNotFound


@dataclass(frozen=True)
class _Block:
    text: str
    priority: int
    required: bool = False
    translation_id: int | None = None
    term_id: int | None = None
    source_id: int | None = None
    context_count: int = 0


def _json_line(label: str, payload: dict) -> str:
    return f"{label} {json.dumps(payload, ensure_ascii=False, separators=(',', ':'))}"


def _fit_required_blocks(
    blocks: list[_Block], max_chars: int
) -> tuple[list[_Block], bool]:
    """Shrink unbounded text fields while preserving valid labeled JSON lines."""
    parsed = []
    for block in blocks:
        label, raw = block.text.split(" ", 1)
        parsed.append([block, label, json.loads(raw)])

    def render_all() -> list[str]:
        return [_json_line(label, payload) for _, label, payload in parsed]

    def string_slots(value):
        slots = []
        if isinstance(value, dict):
            for key, child in value.items():
                if isinstance(child, str):
                    slots.append((len(child), value, key))
                else:
                    slots.extend(string_slots(child))
        elif isinstance(value, list):
            for index, child in enumerate(value):
                if isinstance(child, str):
                    slots.append((len(child), value, index))
                else:
                    slots.extend(string_slots(child))
        return slots

    texts = render_all()
    changed = False
    while sum(map(len, texts)) + max(0, len(texts) - 1) > max_chars:
        slots = []
        for _, _, payload in parsed:
            slots.extend(string_slots(payload))
        shrinkable = [slot for slot in slots if slot[0] > 1]
        if not shrinkable:
            raise ValueError("required knowledge cannot fit configured character limit")
        length, container, key = max(shrinkable, key=lambda item: item[0])
        value = container[key]
        next_length = max(1, length // 2)
        container[key] = value[:next_length] + ("…" if next_length < length else "")
        changed = True
        texts = render_all()

    return (
        [replace(block, text=text) for (block, _, _), text in zip(parsed, texts)],
        changed,
    )


def _term_statement(term: Term, number: int) -> _Block:
    return _Block(
        required=True,
        priority=0,
        text=_json_line(f"TERM-{number}", {
            "term_id": term.id,
            "preferred_name_zh": term.preferred_name_zh,
            "definition_zh": term.definition_zh,
            "cultural_connotation": term.cultural_connotation,
            "term_level": term.term_level,
            "culture_category": term.culture_category,
            "data_quality": term.data_quality,
        }),
    )


def _translation_blocks(term: Term, start: int) -> tuple[list[_Block], int]:
    translations = sorted(
        (item for item in term.translations if item.language.code == "en"),
        key=lambda item: (item.translation_type != "recommended", item.id),
    )
    blocks = []
    has_required = False
    number = start
    for translation in translations:
        required = not has_required
        has_required = True
        contexts = [
            {
                "code": item.context.code,
                "name_zh": item.context.name_zh,
                "audience": item.context.audience,
                "style": item.context.style,
                "recommendation_level": item.recommendation_level,
                "example": item.example,
                "note": item.note,
            }
            for item in sorted(translation.contexts, key=lambda item: item.context_id)
        ]
        blocks.append(_Block(
            required=required,
            priority=1 if required else 2,
            translation_id=translation.id,
            term_id=term.id,
            context_count=len(contexts),
            text=_json_line(f"TRANSLATION-{number}", {
                "translation_id": translation.id,
                "term_id": term.id,
                "text": translation.text,
                "translation_type": translation.translation_type,
                "authority_level": translation.authority_level,
                "region": translation.region,
                "review_status": translation.review_status,
                "note": translation.note,
                "contexts": contexts,
            }),
        ))
        number += 1
    return blocks, number


def _source_blocks(term: Term, start: int) -> tuple[list[_Block], int, dict[int, dict]]:
    blocks = []
    details = {}
    number = start
    evidence_by_source: dict[int, list[dict]] = {}
    for evidence in sorted(term.evidence, key=lambda item: item.id):
        evidence_by_source.setdefault(evidence.source_id, []).append({
            "translation_id": evidence.translation_id,
            "original_excerpt": evidence.original_excerpt,
            "translated_excerpt": evidence.translated_excerpt,
            "locator": evidence.locator,
            "note": evidence.note,
        })
    for source in sorted(term.sources, key=lambda item: item.id):
        detail = {
            "source_id": source.id,
            "title": source.title,
            "organization": source.organization,
            "url": source.url,
            "citation": source.citation,
        }
        details[source.id] = detail
        blocks.append(_Block(
            priority=3,
            source_id=source.id,
            text=_json_line(f"SOURCE-{number}", {
                **detail,
                "term_id": term.id,
                "source_type": source.source_type,
                "language_code": source.language_code,
                "authority_level": source.authority_level,
                "summary": source.summary,
                "evidence": evidence_by_source.get(source.id, []),
            }),
        ))
        number += 1
    return blocks, number, details


def _context_blocks(term: Term, start: int) -> tuple[list[_Block], int]:
    blocks = []
    number = start
    for item in sorted(term.contexts, key=lambda value: value.context_id):
        blocks.append(_Block(
            priority=5,
            context_count=1,
            text=_json_line(f"CONTEXT-{number}", {
                "term_id": term.id,
                "code": item.context.code,
                "name_zh": item.context.name_zh,
                "audience": item.context.audience,
                "style": item.context.style,
                "description": item.context.description,
                "explanation": item.explanation,
                "example": item.example,
                "note": item.note,
            }),
        ))
        number += 1
    return blocks, number


def _note_blocks(term: Term, start: int) -> tuple[list[_Block], int]:
    blocks = []
    number = start
    for note in sorted(term.cultural_notes, key=lambda item: item.id):
        blocks.append(_Block(
            priority=4,
            text=_json_line(f"NOTE-{number}", {
                "term_id": term.id,
                "target_culture": note.target_culture,
                "difference_summary": note.difference_summary,
                "literal_risk": note.literal_risk,
                "misconception": note.misconception,
                "recommendation": note.recommendation,
            }),
        ))
        number += 1
    return blocks, number


def _relation_blocks(term: Term) -> list[_Block]:
    blocks = []
    for relation in sorted(
        term.outgoing_relations,
        key=lambda item: (item.target_term_id, item.relation_type),
    ):
        if relation.target_term.status == "published":
            blocks.append(_Block(
                priority=6,
                text=_json_line("RELATED-TERM", {
                    "selected_term_id": term.id,
                    "relation_type": relation.relation_type,
                    "related_name_zh": relation.target_term.preferred_name_zh,
                }),
            ))
    return blocks


def build_knowledge_pack(term_ids: list[int], max_chars: int) -> KnowledgePack:
    requested_ids = list(dict.fromkeys(term_ids))
    stmt = (
        db.select(Term)
        .where(Term.id.in_(requested_ids), Term.status == "published")
        .options(
            selectinload(Term.translations).selectinload(Translation.language),
            selectinload(Term.translations)
            .selectinload(Translation.contexts)
            .selectinload(TranslationContext.context),
            selectinload(Term.sources),
            selectinload(Term.evidence).selectinload(TermEvidence.source),
            selectinload(Term.contexts).selectinload(TermContext.context),
            selectinload(Term.cultural_notes),
            selectinload(Term.outgoing_relations).selectinload(TermRelation.target_term),
        )
    )
    terms_by_id = {term.id: term for term in db.session.scalars(stmt).unique()}
    missing_ids = [term_id for term_id in requested_ids if term_id not in terms_by_id]
    if missing_ids:
        raise KnowledgeTermNotFound(missing_ids)

    blocks: list[_Block] = []
    source_details: dict[int, dict] = {}
    translation_number = source_number = context_number = note_number = 1
    for term_number, term_id in enumerate(requested_ids, start=1):
        term = terms_by_id[term_id]
        blocks.append(_term_statement(term, term_number))
        translation_blocks, translation_number = _translation_blocks(term, translation_number)
        blocks.extend(translation_blocks)
        source_blocks, source_number, details = _source_blocks(term, source_number)
        blocks.extend(source_blocks)
        source_details.update(details)
        context_blocks, context_number = _context_blocks(term, context_number)
        blocks.extend(context_blocks)
        note_blocks, note_number = _note_blocks(term, note_number)
        blocks.extend(note_blocks)
        blocks.extend(_relation_blocks(term))

    required = [block for block in blocks if block.required]
    fitted_required, required_truncated = _fit_required_blocks(required, max_chars)
    fitted_by_identity = {
        id(original): fitted for original, fitted in zip(required, fitted_required)
    }
    blocks = [fitted_by_identity.get(id(block), block) for block in blocks]

    ordered = sorted(enumerate(blocks), key=lambda pair: (pair[1].priority, pair[0]))
    included: list[_Block] = []
    current_length = 0
    truncated = required_truncated
    for _, block in ordered:
        added_length = len(block.text) + (1 if included else 0)
        if block.required or current_length + added_length <= max_chars:
            included.append(block)
            current_length += added_length
        else:
            truncated = True

    allowed_translation_ids = {
        block.translation_id for block in included if block.translation_id is not None
    }
    translation_term_ids = {
        block.translation_id: block.term_id
        for block in included
        if block.translation_id is not None and block.term_id is not None
    }
    allowed_source_ids = {
        block.source_id for block in included if block.source_id is not None
    }
    included_source_details = {
        source_id: source_details[source_id] for source_id in allowed_source_ids
    }
    return KnowledgePack(
        prompt_text="\n".join(block.text for block in included),
        summary=KnowledgeSummary(
            term_count=len(requested_ids),
            translation_count=len(allowed_translation_ids),
            source_count=len(allowed_source_ids),
            context_count=sum(block.context_count for block in included),
            truncated=truncated,
        ),
        allowed_term_ids=set(requested_ids),
        allowed_translation_ids=allowed_translation_ids,
        allowed_source_ids=allowed_source_ids,
        source_details=included_source_details,
        translation_term_ids=translation_term_ids,
    )
