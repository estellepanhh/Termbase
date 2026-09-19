import unittest

from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.expression_lab.contracts import KnowledgeTermNotFound
from termbase_app.expression_lab.knowledge import build_knowledge_pack
from termbase_app.models import (
    Context,
    CulturalNote,
    Language,
    Source,
    Term,
    TermContext,
    TermEvidence,
    Translation,
    TranslationContext,
)


class ExpressionLabKnowledgeTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:",
            "RATELIMIT_ENABLED": False,
        })
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()

        english = Language(code="en", name_zh="英语", name_en="English")
        french = Language(code="fr", name_zh="法语", name_en="French")
        self.term = Term(
            preferred_name_zh="和而不同",
            definition_zh="承认差异并追求和谐共处",
            cultural_connotation="尊重差异，不追求整齐划一",
            term_level="本源层",
            culture_category="中华优秀传统文化",
            status="published",
            data_quality="curated",
        )
        self.draft = Term(
            preferred_name_zh="内部草稿",
            definition_zh="不得进入知识包",
            status="draft",
        )
        recommended = Translation(
            term=self.term,
            language=english,
            text="harmony in diversity",
            translation_type="recommended",
            authority_level="curated",
            review_status="reviewed",
        )
        alternative = Translation(
            term=self.term,
            language=english,
            text="harmony without uniformity",
            translation_type="alternative",
            review_status="unreviewed",
        )
        Translation(
            term=self.term,
            language=french,
            text="harmonie dans la diversité",
            translation_type="recommended",
            review_status="unreviewed",
        )
        source = Source(
            title="中华思想文化术语",
            organization="权威术语项目",
            source_type="book",
            url="https://example.test/source",
            citation="术语条目",
            authority_level="verified",
        )
        self.term.sources.append(source)
        TermEvidence(
            term=self.term,
            translation=recommended,
            source=source,
            original_excerpt="君子和而不同",
            translated_excerpt="The exemplary person seeks harmony, not uniformity.",
            locator="chapter 13",
        )
        context = Context(
            code="overseas-youth",
            name_zh="海外青年",
            audience="overseas_youth",
            style="accessible",
            description="面向非专业青年受众",
        )
        TermContext(term=self.term, context=context, explanation="可以不同，但能和谐相处")
        TranslationContext(
            translation=alternative,
            context=context,
            recommendation_level="conditional",
            note="适合需要解释uniformity的场景",
        )
        CulturalNote(
            term=self.term,
            target_culture="English-speaking audiences",
            difference_summary="Harmony may be mistaken for sameness.",
            literal_risk="The contrast with uniformity can disappear.",
            misconception="Harmony requires eliminating differences.",
            recommendation="Explain that difference is preserved.",
        )
        db.session.add_all([english, french, self.term, self.draft])
        db.session.commit()
        self.recommended_id = recommended.id
        self.alternative_id = alternative.id
        self.source_id = source.id

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()

    def test_pack_contains_stable_numbered_published_knowledge(self):
        first = build_knowledge_pack([self.term.id], max_chars=18000)
        second = build_knowledge_pack([self.term.id], max_chars=18000)

        self.assertEqual(first.prompt_text, second.prompt_text)
        self.assertIn("TERM-1", first.prompt_text)
        self.assertIn("TRANSLATION-1", first.prompt_text)
        self.assertIn("SOURCE-1", first.prompt_text)
        self.assertIn("harmony in diversity", first.prompt_text)
        self.assertNotIn("harmonie dans la diversité", first.prompt_text)
        self.assertNotIn("legacy_payload", first.prompt_text)
        self.assertEqual(first.allowed_term_ids, {self.term.id})
        self.assertEqual(
            first.allowed_translation_ids,
            {self.recommended_id, self.alternative_id},
        )
        self.assertEqual(first.allowed_source_ids, {self.source_id})
        self.assertEqual(first.source_details[self.source_id]["title"], "中华思想文化术语")
        self.assertEqual(first.summary.term_count, 1)
        self.assertEqual(first.summary.translation_count, 2)
        self.assertEqual(first.summary.source_count, 1)
        self.assertFalse(first.summary.truncated)

    def test_pack_rejects_missing_or_unpublished_terms(self):
        with self.assertRaises(KnowledgeTermNotFound) as captured:
            build_knowledge_pack([self.term.id, self.draft.id, 9999], max_chars=18000)

        self.assertEqual(captured.exception.missing_ids, [self.draft.id, 9999])

    def test_pack_preserves_requested_term_order(self):
        second_term = Term(
            preferred_name_zh="天下大同",
            definition_zh="共同追求的理想社会",
            status="published",
        )
        db.session.add(second_term)
        db.session.commit()

        pack = build_knowledge_pack([second_term.id, self.term.id], max_chars=18000)

        self.assertLess(pack.prompt_text.index("天下大同"), pack.prompt_text.index("和而不同"))

    def test_pack_truncates_low_priority_blocks_without_losing_core_or_recommended(self):
        pack = build_knowledge_pack([self.term.id], max_chars=450)

        self.assertIn("和而不同", pack.prompt_text)
        self.assertIn("harmony in diversity", pack.prompt_text)
        self.assertTrue(pack.summary.truncated)
        self.assertIn(self.recommended_id, pack.allowed_translation_ids)
        self.assertLessEqual(len(pack.prompt_text), 450)

    def test_pack_caps_oversized_required_database_fields(self):
        self.term.definition_zh = "极长定义" * 5000
        db.session.commit()

        pack = build_knowledge_pack([self.term.id], max_chars=600)

        self.assertLessEqual(len(pack.prompt_text), 600)
        self.assertIn("和而不同", pack.prompt_text)
        self.assertIn(self.recommended_id, pack.allowed_translation_ids)


if __name__ == "__main__":
    unittest.main()
