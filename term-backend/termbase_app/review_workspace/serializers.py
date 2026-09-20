from __future__ import annotations

from ..models import ReviewCase, ReviewEvent, ReviewRevision


def _iso(value):
    return value.isoformat() if value is not None else None


def serialize_revision(revision: ReviewRevision) -> dict:
    return {
        "revision_number": revision.revision_number,
        "final_expression": revision.final_expression,
        "review_notes": revision.review_notes,
        "reviewer_name": revision.reviewer_name,
        "issue_tags": revision.issue_tags or [],
        "created_at": _iso(revision.created_at),
    }


def serialize_event(event: ReviewEvent) -> dict:
    return {
        "event_type": event.event_type,
        "from_status": event.from_status,
        "to_status": event.to_status,
        "reviewer_name": event.reviewer_name,
        "note": event.note,
        "created_at": _iso(event.created_at),
    }


def serialize_case_summary(case: ReviewCase) -> dict:
    current = next(
        item for item in case.revisions
        if item.revision_number == case.current_revision_number
    )
    return {
        "public_id": case.public_id,
        "title": case.title,
        "source_text": case.source_text,
        "status": case.status,
        "current_revision_number": case.current_revision_number,
        "current_revision": serialize_revision(current),
        "terms": [{
            "id": link.term.id,
            "preferred_name_zh": link.term.preferred_name_zh,
        } for link in case.term_links],
        "created_at": _iso(case.created_at),
        "updated_at": _iso(case.updated_at),
    }


def serialize_case_detail(case: ReviewCase) -> dict:
    return {
        **serialize_case_summary(case),
        "task": {
            "target_language": case.target_language,
            "audience": case.audience,
            "scenario": case.scenario,
            "style": case.style,
            "locale": case.locale,
        },
        "ai_snapshot": case.ai_snapshot,
        "revisions": [serialize_revision(item) for item in case.revisions],
        "events": [serialize_event(item) for item in case.events],
    }
