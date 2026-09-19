import unittest
from unittest.mock import Mock

from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.expression_lab.contracts import (
    ProviderUnavailable,
    ValidatedExpressionReport,
)
from termbase_app.models import Language, Source, Term, Translation


def task_payload(term_id):
    return {
        "term_ids": [term_id],
        "source_text": "和而不同强调在差异中寻求和谐共处。",
        "target_language": "en",
        "audience": "overseas_youth",
        "scenario": "cultural_exhibition",
        "style": "explanatory",
        "locale": "general_english",
    }


def generated_report(source_id):
    return ValidatedExpressionReport.model_validate({
        "recommended": {
            "text": "Harmony in diversity",
            "rationale": "Keeps both harmony and difference.",
            "strategy": ["explanatory_translation"],
        },
        "alternatives": [{
            "text": "Harmony without uniformity",
            "best_for": "Academic contexts",
            "tradeoff": "More literal",
        }],
        "term_usage": [],
        "cultural_risks": [],
        "references": [{
            "source_id": source_id,
            "title": "中华思想文化术语",
            "organization": "权威术语项目",
            "url": "https://example.test/source",
            "citation": "术语条目",
            "usage": "Supports the translation",
        }],
        "limitations": ["Needs human review"],
        "review_priority": "medium",
        "warnings": [],
    })


class ExpressionLabApiTests(unittest.TestCase):
    def setUp(self):
        self.generator = Mock()
        self.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:",
            "RATELIMIT_ENABLED": False,
            "EXPRESSION_LAB_GENERATOR": self.generator,
        })
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        language = Language(code="en", name_zh="英语", name_en="English")
        self.term = Term(
            preferred_name_zh="和而不同",
            definition_zh="承认差异并追求和谐共处",
            status="published",
        )
        Translation(
            term=self.term,
            language=language,
            text="harmony in diversity",
            translation_type="recommended",
        )
        self.source = Source(title="中华思想文化术语", source_type="book")
        self.term.sources.append(self.source)
        db.session.add_all([language, self.term])
        db.session.commit()
        self.generator.return_value = generated_report(self.source.id)
        self.client = self.app.test_client()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()

    def test_returns_stable_ai_unreviewed_envelope_without_writing(self):
        counts_before = (db.session.query(Term).count(), db.session.query(Translation).count())
        response = self.client.post(
            "/api/v1/expression-lab/analyze", json=task_payload(self.term.id)
        )

        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(body["code"], 200)
        self.assertEqual(body["data"]["review_status"], "ai_unreviewed")
        self.assertEqual(body["data"]["report"]["recommended"]["text"], "Harmony in diversity")
        self.assertNotIn("prompt", str(body).lower())
        self.assertEqual(
            counts_before,
            (db.session.query(Term).count(), db.session.query(Translation).count()),
        )

    def test_rejects_non_json_oversized_and_invalid_payloads(self):
        non_json = self.client.post(
            "/api/v1/expression-lab/analyze", data="plain text", content_type="text/plain"
        )
        self.assertEqual(non_json.status_code, 415)

        self.app.config["EXPRESSION_LAB_MAX_BODY_BYTES"] = 32
        oversized = self.client.post(
            "/api/v1/expression-lab/analyze", json=task_payload(self.term.id)
        )
        self.assertEqual(oversized.status_code, 413)
        self.app.config["EXPRESSION_LAB_MAX_BODY_BYTES"] = 16384

        invalid = task_payload(self.term.id)
        invalid["audience"] = "everyone"
        response = self.client.post("/api/v1/expression-lab/analyze", json=invalid)
        self.assertEqual(response.status_code, 400)
        self.assertIn("audience", response.get_json()["data"]["fields"])

    def test_maps_unpublished_and_provider_errors(self):
        missing = self.client.post(
            "/api/v1/expression-lab/analyze", json=task_payload(999999)
        )
        self.assertEqual(missing.status_code, 404)
        self.assertEqual(missing.get_json()["data"]["missing_term_ids"], [999999])

        self.generator.side_effect = ProviderUnavailable("hidden provider detail")
        unavailable = self.client.post(
            "/api/v1/expression-lab/analyze", json=task_payload(self.term.id)
        )
        self.assertEqual(unavailable.status_code, 503)
        self.assertNotIn("hidden provider detail", unavailable.get_data(as_text=True))


class ExpressionLabRateLimitTests(unittest.TestCase):
    def setUp(self):
        self.generator = Mock(return_value=generated_report(1))
        self.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:",
            "RATELIMIT_ENABLED": True,
            "RATELIMIT_STORAGE_URI": "memory://",
            "EXPRESSION_LAB_RATE_LIMIT": "2 per minute",
            "EXPRESSION_LAB_GENERATOR": self.generator,
        })
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        term = Term(preferred_name_zh="礼", definition_zh="礼仪规范", status="published")
        db.session.add(term)
        db.session.commit()
        self.term_id = term.id
        self.client = self.app.test_client()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()

    def test_limits_by_remote_address_and_returns_json(self):
        payload = task_payload(self.term_id)
        for _ in range(2):
            response = self.client.post(
                "/api/v1/expression-lab/analyze",
                json=payload,
                environ_base={"REMOTE_ADDR": "203.0.113.10"},
            )
            self.assertEqual(response.status_code, 200)
        limited = self.client.post(
            "/api/v1/expression-lab/analyze",
            json=payload,
            environ_base={"REMOTE_ADDR": "203.0.113.10"},
        )
        other_ip = self.client.post(
            "/api/v1/expression-lab/analyze",
            json=payload,
            environ_base={"REMOTE_ADDR": "203.0.113.11"},
        )
        self.assertEqual(limited.status_code, 429)
        self.assertEqual(limited.content_type, "application/json")
        self.assertEqual(limited.get_json()["code"], 429)
        self.assertEqual(other_ip.status_code, 200)


if __name__ == "__main__":
    unittest.main()
