import copy

import pytest
from pydantic import ValidationError

from termbase_app.review_workspace.contracts import (
    CreateReviewCase,
    CreateRevision,
    IssueTag,
    ReviewStatus,
    TransitionAction,
    TransitionCase,
)


def valid_analysis():
    return {
        "request_id": "req-1",
        "input_summary": {
            "source_text": "和而不同强调在差异中寻求和谐共处。",
            "target_language": "en",
            "audience": "overseas_youth",
            "scenario": "cultural_exhibition",
            "style": "explanatory",
            "locale": "general_english",
        },
        "knowledge_summary": {
            "term_count": 1,
            "translation_count": 1,
            "source_count": 1,
            "context_count": 0,
            "truncated": False,
        },
        "report": {
            "recommended": {
                "text": "Harmony in diversity",
                "rationale": "Preserves difference.",
                "strategy": ["explanatory_translation"],
            },
            "alternatives": [{
                "text": "Harmony without uniformity",
                "best_for": "Academic contexts",
                "tradeoff": "More literal",
            }],
            "term_usage": [{
                "term_id": 7,
                "translation_id": 11,
                "adopted_translation": "harmony in diversity",
                "explanation": "Uses the curated translation",
            }],
            "cultural_risks": [],
            "references": [{
                "source_id": 13,
                "title": "中华思想文化术语",
                "organization": "术语项目",
                "url": "https://example.test/source",
                "citation": "术语条目",
                "usage": "Supports the translation",
            }],
            "limitations": ["Needs human review"],
            "review_priority": "medium",
        },
        "generated_at": "2026-09-20T00:00:00+00:00",
        "review_status": "ai_unreviewed",
        "warnings": [],
    }


def valid_create_payload():
    return {"title": " 和而不同海外传播案例 ", "term_ids": [7, 7], "analysis": valid_analysis()}


def test_create_case_normalizes_and_validates_public_analysis():
    command = CreateReviewCase.model_validate(valid_create_payload())
    assert command.title == "和而不同海外传播案例"
    assert command.term_ids == [7]
    assert command.analysis.review_status == "ai_unreviewed"
    assert command.analysis.report.recommended.text == "Harmony in diversity"


@pytest.mark.parametrize("field,value", [
    ("review_status", "approved"),
    ("extra", "forbidden"),
])
def test_create_case_rejects_non_ai_snapshot_and_extra_fields(field, value):
    payload = valid_create_payload()
    if field == "extra":
        payload[field] = value
    else:
        payload["analysis"][field] = value
    with pytest.raises(ValidationError):
        CreateReviewCase.model_validate(payload)


def test_create_case_rejects_unselected_term_reference():
    payload = valid_create_payload()
    payload["analysis"]["report"]["term_usage"][0]["term_id"] = 99
    with pytest.raises(ValidationError, match="selected term"):
        CreateReviewCase.model_validate(payload)


def test_revision_deduplicates_fixed_issue_tags_and_requires_content():
    command = CreateRevision.model_validate({
        "expected_revision_number": 1,
        "final_expression": " Human-reviewed expression ",
        "review_notes": " Adjusted the register. ",
        "reviewer_name": " Reviewer A ",
        "issue_tags": ["register_mismatch", "register_mismatch", "other"],
    })
    assert command.final_expression == "Human-reviewed expression"
    assert command.reviewer_name == "Reviewer A"
    assert command.issue_tags == [IssueTag.REGISTER_MISMATCH, IssueTag.OTHER]

    invalid = command.model_dump()
    invalid["final_expression"] = "  "
    with pytest.raises(ValidationError):
        CreateRevision.model_validate(invalid)


def test_transition_contract_uses_stable_enums():
    command = TransitionCase.model_validate({
        "action": "submit",
        "expected_revision_number": 2,
        "reviewer_name": "Reviewer A",
        "note": "Ready",
    })
    assert command.action is TransitionAction.SUBMIT
    assert set(item.value for item in ReviewStatus) == {
        "draft", "pending_review", "approved", "archived",
    }


def test_analysis_is_strict_deeply():
    payload = copy.deepcopy(valid_create_payload())
    payload["analysis"]["report"]["recommended"]["invented"] = True
    with pytest.raises(ValidationError):
        CreateReviewCase.model_validate(payload)
