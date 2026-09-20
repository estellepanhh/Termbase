import json

import pytest

from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.models import Term


def analysis(term_id, request_id="req-api"):
    return {
        "request_id": request_id,
        "input_summary": {"source_text": "和而不同强调在差异中寻求和谐共处。", "target_language": "en", "audience": "overseas_youth", "scenario": "cultural_exhibition", "style": "explanatory", "locale": "general_english"},
        "knowledge_summary": {"term_count": 1, "translation_count": 1, "source_count": 0, "context_count": 0, "truncated": False},
        "report": {"recommended": {"text": "Harmony in diversity", "rationale": "Preserves difference", "strategy": ["explanatory"]}, "alternatives": [{"text": "Harmony without uniformity", "best_for": "Academic", "tradeoff": "Literal"}], "term_usage": [{"term_id": term_id, "translation_id": None, "adopted_translation": "harmony in diversity", "explanation": "Curated"}], "cultural_risks": [], "references": [], "limitations": ["Needs review"], "review_priority": "medium"},
        "generated_at": "2026-09-20T00:00:00Z", "review_status": "ai_unreviewed", "warnings": [],
    }


@pytest.fixture()
def setup():
    app = create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:", "RATELIMIT_ENABLED": False})
    with app.app_context():
        db.create_all()
        term = Term(preferred_name_zh="和而不同", definition_zh="定义", status="published")
        db.session.add(term)
        db.session.commit()
        yield app.test_client(), term.id
        db.session.remove()
        db.drop_all()


def create_payload(term_id, request_id="req-api"):
    return {"title": "海外传播案例", "term_ids": [term_id], "analysis": analysis(term_id, request_id)}


def test_case_api_create_list_detail_and_idempotency(setup):
    client, term_id = setup
    created = client.post("/api/v1/review-cases", json=create_payload(term_id))
    duplicate = client.post("/api/v1/review-cases", json=create_payload(term_id))
    assert created.status_code == 201
    assert duplicate.status_code == 200
    public_id = created.get_json()["data"]["case"]["public_id"]
    assert duplicate.get_json()["data"] == {"case": created.get_json()["data"]["case"], "created": False}

    listed = client.get("/api/v1/review-cases?status=draft&page=1&page_size=10")
    assert listed.status_code == 200
    assert listed.get_json()["data"][0]["public_id"] == public_id
    assert listed.get_json()["meta"]["stats"]["draft"] == 1
    detail = client.get(f"/api/v1/review-cases/{public_id}")
    assert detail.get_json()["data"]["ai_snapshot"]["review_status"] == "ai_unreviewed"


def test_case_api_revision_transition_and_conflict(setup):
    client, term_id = setup
    public_id = client.post("/api/v1/review-cases", json=create_payload(term_id)).get_json()["data"]["case"]["public_id"]
    revision = {"expected_revision_number": 1, "final_expression": "Reviewed expression", "review_notes": "Adjusted", "reviewer_name": "Reviewer A", "issue_tags": ["register_mismatch"]}
    saved = client.post(f"/api/v1/review-cases/{public_id}/revisions", json=revision)
    stale = client.post(f"/api/v1/review-cases/{public_id}/revisions", json=revision)
    assert saved.status_code == 201
    assert saved.get_json()["data"]["revision_number"] == 2
    assert stale.status_code == 409

    submitted = client.post(f"/api/v1/review-cases/{public_id}/transitions", json={"action": "submit", "expected_revision_number": 2, "reviewer_name": "Reviewer A", "note": "Ready"})
    approved = client.post(f"/api/v1/review-cases/{public_id}/transitions", json={"action": "approve", "expected_revision_number": 2, "reviewer_name": "Reviewer B", "note": "Approved"})
    assert submitted.get_json()["data"]["status"] == "pending_review"
    assert approved.get_json()["data"]["status"] == "approved"


def test_case_api_returns_stable_json_errors(setup):
    client, term_id = setup
    malformed = client.post("/api/v1/review-cases", data='{"title":', content_type="application/json")
    invalid = client.post("/api/v1/review-cases", json={"title": ""})
    missing_term = client.post("/api/v1/review-cases", json=create_payload(99999))
    missing_case = client.get("/api/v1/review-cases/not-found")
    non_json = client.post("/api/v1/review-cases", data="x", content_type="text/plain")
    assert malformed.status_code == 400 and malformed.content_type == "application/json"
    assert invalid.status_code == 400
    assert missing_term.status_code == 404
    assert missing_term.get_json()["data"]["missing_term_ids"] == [99999]
    assert missing_case.status_code == 404
    assert non_json.status_code == 415


def test_case_api_rejects_oversized_body(setup):
    client, term_id = setup
    payload = create_payload(term_id)
    payload["padding"] = "x" * 140000
    response = client.post("/api/v1/review-cases", data=json.dumps(payload), content_type="application/json")
    assert response.status_code == 413
