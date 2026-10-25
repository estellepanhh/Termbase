import unittest
from scripts.audit_translation_languages import build_parser

from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.models import Language, Term, Translation
from termbase_app.services.translation_cleanup import (
    build_translation_cleanup,
    infer_explicit_language,
)


class TranslationInferenceTests(unittest.TestCase):
    def test_apply_requires_a_durable_report_path(self):
        parser = build_parser()
        with self.assertRaises(SystemExit):
            parser.parse_args(["--apply"])
        args = parser.parse_args(["--apply", "--report", "cleanup-report.json"])
        self.assertTrue(args.apply)

    def test_recognizes_only_explicit_language_markers(self):
        examples = {
            "法语：communauté de destin": "fr",
            "西班牙语: comunidad de futuro compartido": "es",
            "俄语：сообщество единой судьбы": "ru",
            "阿语: مجتمع المستقبل المشترك": "ar",
            "日语：人類運命共同体": "ja",
        }
        for text, expected in examples.items():
            with self.subTest(text=text):
                result = infer_explicit_language(text, None)
                self.assertIsNotNone(result)
                self.assertEqual(result.code, expected)

    def test_does_not_guess_from_unmarked_text(self):
        self.assertIsNone(infer_explicit_language("harmonie dans la diversité", None))
        self.assertIsNone(infer_explicit_language("共同未来", "旧表导入"))

    def test_can_use_an_explicit_note_without_changing_text(self):
        result = infer_explicit_language("une communauté", "语种：法语")
        self.assertEqual(result.code, "fr")
        self.assertEqual(result.cleaned_text, "une communauté")


class TranslationCleanupTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:",
        })
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        unknown = Language(code="und", name_zh="其他语种", name_en="Other language")
        term = Term(preferred_name_zh="人类命运共同体", status="published")
        term.translations.extend([
            Translation(language=unknown, text="法语：une communauté", note="旧表导入"),
            Translation(language=unknown, text="a community with a shared future", note="旧表导入"),
        ])
        db.session.add(term)
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()

    def test_dry_run_reports_changes_without_mutating(self):
        report = build_translation_cleanup(db.session)

        self.assertEqual(report.scanned, 2)
        self.assertEqual(report.changed, 1)
        self.assertEqual(report.skipped, 1)
        self.assertEqual(report.changes[0].old_language_code, "und")
        self.assertEqual(report.changes[0].new_language_code, "fr")
        self.assertEqual(db.session.query(Translation).filter_by(text="法语：une communauté").one().language.code, "und")

    def test_apply_is_explicit_and_idempotent(self):
        first = build_translation_cleanup(db.session, apply=True)
        second = build_translation_cleanup(db.session, apply=True)

        updated = db.session.query(Translation).filter_by(text="une communauté").one()
        self.assertEqual(first.changed, 1)
        self.assertEqual(updated.language.code, "fr")
        self.assertEqual(second.changed, 0)


if __name__ == "__main__":
    unittest.main()
