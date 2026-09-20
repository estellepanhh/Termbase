import csv
import io

from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.models import Term
from termbase_app.review_workspace.contracts import CreateReviewCase, CreateRevision
from termbase_app.review_workspace.service import add_revision, create_case
from tests.test_review_workspace_api import analysis


def test_json_and_csv_exports_are_research_ready_and_formula_safe():
    app = create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:", "RATELIMIT_ENABLED": False})
    with app.app_context():
        db.create_all()
        term = Term(preferred_name_zh="和而不同", status="published")
        db.session.add(term)
        db.session.commit()
        command = CreateReviewCase.model_validate({"title": "=HYPERLINK(\"bad\")", "term_ids": [term.id], "analysis": analysis(term.id)})
        case, _ = create_case(command)
        add_revision(case.public_id, CreateRevision.model_validate({"expected_revision_number": 1, "final_expression": "+dangerous formula", "review_notes": "中文,换行\n意见", "reviewer_name": "Reviewer A", "issue_tags": ["other"]}))
        client = app.test_client()

        json_response = client.get("/api/v1/review-cases/export?format=json")
        assert json_response.status_code == 200
        assert json_response.get_json()[0]["public_id"] == case.public_id
        assert "api_key" not in json_response.get_data(as_text=True).lower()

        csv_response = client.get("/api/v1/review-cases/export?format=csv")
        assert csv_response.status_code == 200
        assert csv_response.data.startswith(b"\xef\xbb\xbf")
        rows = list(csv.DictReader(io.StringIO(csv_response.data.decode("utf-8-sig"))))
        assert rows[0]["title"].startswith("'=")
        assert rows[0]["final_expression"].startswith("'+")
        assert rows[0]["review_notes"] == "中文,换行\n意见"
