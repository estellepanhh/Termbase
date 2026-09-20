import pytest

from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.models import ReviewCase, ReviewEvent, ReviewRevision, Term
from termbase_app.review_workspace.contracts import (
    CreateReviewCase,
    CreateRevision,
    TransitionCase,
)
from termbase_app.review_workspace.service import (
    ArchivedCase,
    InvalidTransition,
    RevisionConflict,
    ReviewTermNotFound,
    add_revision,
    create_case,
    get_case,
    list_cases,
    transition_case,
    workspace_stats,
)


def analysis(term_id):
    return {
        "request_id": "req-1",
        "input_summary": {"source_text": "和而不同强调在差异中寻求和谐共处。", "target_language": "en", "audience": "overseas_youth", "scenario": "cultural_exhibition", "style": "explanatory", "locale": "general_english"},
        "knowledge_summary": {"term_count": 1, "translation_count": 1, "source_count": 0, "context_count": 0, "truncated": False},
        "report": {
            "recommended": {"text": "Harmony in diversity", "rationale": "Preserves difference", "strategy": ["explanatory"]},
            "alternatives": [{"text": "Harmony without uniformity", "best_for": "Academic", "tradeoff": "Literal"}],
            "term_usage": [{"term_id": term_id, "translation_id": None, "adopted_translation": "harmony in diversity", "explanation": "Uses the term"}],
            "cultural_risks": [], "references": [], "limitations": ["Needs review"], "review_priority": "medium",
        },
        "generated_at": "2026-09-20T00:00:00Z", "review_status": "ai_unreviewed", "warnings": [],
    }


@pytest.fixture()
def app():
    app = create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:", "RATELIMIT_ENABLED": False})
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


def published_term(name="和而不同"):
    term = Term(preferred_name_zh=name, definition_zh="定义", status="published")
    db.session.add(term)
    db.session.commit()
    return term


def command_for(term, request_id="req-1", title="海外传播案例"):
    payload = {"title": title, "term_ids": [term.id], "analysis": analysis(term.id)}
    payload["analysis"]["request_id"] = request_id
    return CreateReviewCase.model_validate(payload)


def revision(expected=1, reviewer="Reviewer A"):
    return CreateRevision.model_validate({
        "expected_revision_number": expected,
        "final_expression": "A carefully reviewed expression",
        "review_notes": "Adjusted register",
        "reviewer_name": reviewer,
        "issue_tags": ["register_mismatch"],
    })


def transition(action, expected, note=""):
    return TransitionCase.model_validate({
        "action": action,
        "expected_revision_number": expected,
        "reviewer_name": "Reviewer A",
        "note": note,
    })


def test_create_case_is_atomic_ordered_and_idempotent(app):
    term = published_term()
    case, created = create_case(command_for(term))
    duplicate, duplicate_created = create_case(command_for(term))

    assert created is True
    assert duplicate_created is False
    assert duplicate.id == case.id
    assert case.status == "draft"
    assert case.current_revision_number == 1
    assert case.revisions[0].final_expression == "Harmony in diversity"
    assert case.revisions[0].reviewer_name == ""
    assert case.term_links[0].term_id == term.id
    assert case.events[0].event_type == "created"
    assert db.session.query(ReviewCase).count() == 1


def test_create_case_rejects_unpublished_term_without_partial_rows(app):
    term = Term(preferred_name_zh="内部草稿", status="draft")
    db.session.add(term)
    db.session.commit()

    with pytest.raises(ReviewTermNotFound) as captured:
        create_case(command_for(term))

    assert captured.value.missing_ids == [term.id]
    assert db.session.query(ReviewCase).count() == 0
    assert db.session.query(ReviewRevision).count() == 0


def test_revision_is_append_only_and_stale_versions_conflict(app):
    term = published_term()
    case, _ = create_case(command_for(term))
    saved = add_revision(case.public_id, revision())

    assert saved.revision_number == 2
    assert [item.final_expression for item in get_case(case.public_id).revisions] == [
        "Harmony in diversity", "A carefully reviewed expression",
    ]
    with pytest.raises(RevisionConflict):
        add_revision(case.public_id, revision(expected=1))
    assert db.session.query(ReviewRevision).count() == 2


def test_state_machine_requires_reviewed_revision_and_records_events(app):
    term = published_term()
    case, _ = create_case(command_for(term))
    with pytest.raises(InvalidTransition):
        transition_case(case.public_id, transition("submit", 1))

    add_revision(case.public_id, revision())
    transition_case(case.public_id, transition("submit", 2))
    transition_case(case.public_id, transition("approve", 2))
    transition_case(case.public_id, transition("archive", 2))
    assert get_case(case.public_id).status == "archived"
    assert [event.event_type for event in get_case(case.public_id).events] == [
        "created", "submitted", "approved", "archived",
    ]
    with pytest.raises(ArchivedCase):
        add_revision(case.public_id, revision(expected=2))
    with pytest.raises(InvalidTransition):
        transition_case(case.public_id, transition("submit", 2))


def test_return_and_reopen_require_notes(app):
    term = published_term()
    case, _ = create_case(command_for(term))
    add_revision(case.public_id, revision())
    transition_case(case.public_id, transition("submit", 2))
    with pytest.raises(InvalidTransition):
        transition_case(case.public_id, transition("return", 2))
    transition_case(case.public_id, transition("return", 2, "Needs revision"))
    assert get_case(case.public_id).status == "draft"


def test_list_filters_and_workspace_stats_use_current_revision(app):
    first = published_term()
    second = published_term("天下大同")
    case_one, _ = create_case(command_for(first, "req-one"))
    case_two, _ = create_case(command_for(second, "req-two", "天下大同研究"))
    add_revision(case_one.public_id, revision(reviewer="Alice"))

    page = list_cases(page=1, page_size=20, reviewer="Ali", term_id=first.id, issue_tag="register_mismatch")
    assert [item.public_id for item in page.items] == [case_one.public_id]
    assert list_cases(page=1, page_size=20, q="天下").items[0].public_id == case_two.public_id
    stats = workspace_stats()
    assert stats["draft"] == 2
    assert stats["total"] == 2
    assert stats["average_revision_count"] == 1.5
