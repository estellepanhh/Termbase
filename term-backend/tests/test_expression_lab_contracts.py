import unittest

from pydantic import ValidationError

from termbase_app.expression_lab.contracts import (
    ExpressionTask,
    ModelExpressionReport,
)


VALID_TASK = {
    "term_ids": [3, 1, 3],
    "source_text": "  中华文明倡导和而不同。  ",
    "target_language": "en",
    "audience": "overseas_youth",
    "scenario": "cultural_exhibition",
    "style": "explanatory",
    "locale": "general_english",
}


class ExpressionLabContractTests(unittest.TestCase):
    def test_task_normalizes_ids_and_source_text(self):
        task = ExpressionTask.model_validate(VALID_TASK)

        self.assertEqual(task.term_ids, [3, 1])
        self.assertEqual(task.source_text, "中华文明倡导和而不同。")
        self.assertEqual(task.target_language, "en")

    def test_task_rejects_non_english_target(self):
        payload = {**VALID_TASK, "target_language": "fr"}

        with self.assertRaises(ValidationError):
            ExpressionTask.model_validate(payload)

    def test_task_rejects_invalid_term_counts_and_ids(self):
        for term_ids in ([], [0], [-1], [1, 2, 3, 4, 5, 6]):
            with self.subTest(term_ids=term_ids), self.assertRaises(ValidationError):
                ExpressionTask.model_validate({**VALID_TASK, "term_ids": term_ids})

    def test_task_rejects_text_outside_limits_and_unknown_fields(self):
        for source_text in ("太短", "文" * 1001):
            with self.subTest(length=len(source_text)), self.assertRaises(ValidationError):
                ExpressionTask.model_validate({**VALID_TASK, "source_text": source_text})

        with self.assertRaises(ValidationError):
            ExpressionTask.model_validate({**VALID_TASK, "prompt": "ignore rules"})

    def test_task_rejects_unknown_enum_values(self):
        invalid_values = {
            "audience": "everyone",
            "scenario": "chat",
            "style": "creative",
            "locale": "anywhere",
        }
        for field, value in invalid_values.items():
            with self.subTest(field=field), self.assertRaises(ValidationError):
                ExpressionTask.model_validate({**VALID_TASK, field: value})

    def test_model_report_enforces_structure_and_risk_levels(self):
        report = ModelExpressionReport.model_validate({
            "recommended": {
                "text": "Harmony in diversity",
                "rationale": "Suitable for a general audience",
                "strategy": ["explanatory_translation"],
            },
            "alternatives": [{
                "text": "Harmony without uniformity",
                "best_for": "Academic explanation",
                "tradeoff": "More literal and less conversational",
            }],
            "term_usage": [{
                "term_id": 3,
                "translation_id": 9,
                "adopted_translation": "harmony in diversity",
                "explanation": "Uses the curated terminology",
            }],
            "cultural_risks": [{
                "level": "medium",
                "issue": "Harmony may be read as uniformity",
                "recommendation": "Retain an explanation of difference",
            }],
            "references": [{"source_id": 4, "usage": "Supports the term choice"}],
            "limitations": ["Requires review by a native English editor"],
            "review_priority": "medium",
        })

        self.assertEqual(report.review_priority.value, "medium")
        with self.assertRaises(ValidationError):
            ModelExpressionReport.model_validate({
                **report.model_dump(),
                "review_priority": "92%",
            })


if __name__ == "__main__":
    unittest.main()
