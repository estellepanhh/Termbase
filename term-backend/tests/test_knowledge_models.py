import unittest

from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.models import Language, Source, Term, Translation


class KnowledgeModelTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:",
        })
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()

    def tearDown(self):
        db.drop_all()
        self.context.pop()

    def test_term_keeps_multiple_translations_and_sources(self):
        term = Term(
            preferred_name_zh="和而不同",
            definition_zh="承认差异并追求和谐共处",
            term_level="本源层",
            culture_category="中华优秀传统文化",
            status="published",
            data_quality="legacy_unreviewed",
        )
        language = Language(code="en", name_zh="英语", name_en="English")
        source = Source(title="中华思想文化术语", source_type="book")
        translation = Translation(
            term=term,
            language=language,
            text="harmony in diversity",
            translation_type="recommended",
            review_status="unreviewed",
        )
        term.sources.append(source)
        db.session.add_all([term, language, translation])
        db.session.commit()

        saved = db.session.get(Term, term.id)
        self.assertEqual(saved.translations[0].text, "harmony in diversity")
        self.assertEqual(saved.sources[0].title, "中华思想文化术语")
