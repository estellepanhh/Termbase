import unittest

from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.models import (
    Context,
    CulturalNote,
    Language,
    Source,
    Term,
    TermContext,
    TermEvidence,
    TermName,
    TermRelation,
    Topic,
    TopicItem,
    Translation,
    TranslationContext,
)


class PublicTermsApiTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:",
        })
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        self.client = self.app.test_client()

        en = Language(code="en", name_zh="英语", name_en="English")
        fr = Language(code="fr", name_zh="法语", name_en="French")
        child_context = Context(
            code="children",
            name_zh="儿童",
            audience="children",
            style="plain",
            description="面向儿童的解释",
        )
        academic_context = Context(
            code="academic",
            name_zh="学术",
            audience="researchers",
            style="formal",
            description="用于学术论述",
        )
        term = Term(
            preferred_name_zh="和而不同",
            definition_zh="承认差异并追求和谐共处",
            cultural_connotation="和谐不是同一",
            term_level="本源层",
            culture_category="中华优秀传统文化",
            status="published",
            data_quality="legacy_unreviewed",
        )
        recommended = Translation(
            term=term,
            language=en,
            text="harmony in diversity",
            translation_type="recommended",
            authority_level="official",
            region="global",
            review_status="reviewed",
            note="优先使用",
        )
        Translation(
            term=term,
            language=fr,
            text="harmonie dans la diversite",
            translation_type="reference",
            authority_level="reference",
            review_status="unreviewed",
        )
        primary_source = Source(
            title="论语",
            organization="孔子",
            language_code="zh",
            source_type="classic",
            url="https://example.test/lunyu",
            citation="《论语》子路篇",
            authority_level="primary",
            summary="儒家经典",
            legacy_value="论语",
        )
        secondary_source = Source(title="术语规范", source_type="standard")
        term.sources.extend([primary_source, secondary_source])
        TermName(term=term, name="和不同", name_type="short")
        TermContext(
            term=term,
            context=child_context,
            explanation="大家可以不一样",
            example="同学意见不同也能合作",
            note="避免抽象表达",
        )
        TranslationContext(
            translation=recommended,
            context=academic_context,
            recommendation_level="recommended",
            example="The concept values difference.",
            note="论文首次出现时解释",
        )
        TermEvidence(
            term=term,
            translation=recommended,
            source=primary_source,
            original_excerpt="君子和而不同",
            translated_excerpt="Harmony without uniformity",
            locator="子路篇",
            note="出处说明",
        )
        CulturalNote(
            term=term,
            target_culture="English-speaking",
            difference_summary="不等同于妥协",
            literal_risk="仅译为 harmony 会遗漏差异",
            misconception="认为必须达成一致",
            recommendation="同时说明 diversity",
        )
        related_term = Term(
            preferred_name_zh="求同存异",
            definition_zh="寻找共同点，保留不同意见",
            term_level="应用层",
            culture_category="中华优秀传统文化",
            status="published",
        )
        TermRelation(source_term=term, target_term=related_term, relation_type="related")
        published_topic = Topic(slug="harmony", title="和谐", summary="理解和谐", status="published")
        TopicItem(
            topic=published_topic,
            term=term,
            entry_type="term",
            title="和而不同",
            payload={"weight": 1},
        )
        draft_topic = Topic(slug="draft", title="草稿专题", status="draft")
        TopicItem(topic=draft_topic, term=term, entry_type="term", title="不应公开")
        hidden = Term(
            preferred_name_zh="和而不显",
            definition_zh="未发布术语",
            term_level="本源层",
            culture_category="中华优秀传统文化",
            status="draft",
        )
        TermRelation(source_term=term, target_term=hidden, relation_type="related")
        db.session.add_all([
            en,
            fr,
            child_context,
            academic_context,
            term,
            related_term,
            published_topic,
            draft_topic,
            hidden,
        ])
        db.session.commit()
        self.term_id = term.id
        self.hidden_term_id = hidden.id
        self.related_term_id = related_term.id

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()

    def test_list_filters_published_terms_and_returns_summary(self):
        response = self.client.get("/api/v1/terms?q=和而&page=1&page_size=20")

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["code"], 200)
        self.assertEqual(payload["meta"], {"page": 1, "page_size": 20, "total": 1})
        self.assertEqual(payload["data"][0]["preferred_name_zh"], "和而不同")
        self.assertEqual(payload["data"][0]["data_quality"], "legacy_unreviewed")
        self.assertEqual(
            payload["data"][0]["recommended_translation"]["text"],
            "harmony in diversity",
        )
        self.assertEqual(payload["data"][0]["language_count"], 2)
        self.assertEqual(payload["data"][0]["source_count"], 2)

    def test_list_searches_name_or_definition(self):
        response = self.client.get("/api/v1/terms?q=差异")

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["preferred_name_zh"] for item in response.get_json()["data"]], ["和而不同"])

    def test_list_filters_by_level_culture_and_translation_language(self):
        response = self.client.get(
            "/api/v1/terms?level=本源层&culture=中华优秀传统文化&language=fr"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [item["id"] for item in response.get_json()["data"]], [self.term_id]
        )

    def test_list_uses_id_order_and_normalizes_pagination_bounds(self):
        response = self.client.get("/api/v1/terms?page=0&page_size=1000")

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["meta"], {"page": 1, "page_size": 100, "total": 2})
        self.assertEqual(
            [item["id"] for item in payload["data"]],
            sorted([self.term_id, self.related_term_id]),
        )

    def test_list_exposes_existing_child_explanation_for_reading_mode(self):
        response = self.client.get("/api/v1/terms?q=和而不同")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["data"][0]["child_explanation"], "大家可以不一样")

    def test_list_rejects_non_integer_pagination_parameters(self):
        response = self.client.get("/api/v1/terms?page=one&page_size=20")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(), {"code": 400, "message": "分页参数必须是整数"}
        )

    def test_detail_includes_complete_provenance_context_and_cultural_data(self):
        response = self.client.get(f"/api/v1/terms/{self.term_id}")

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["code"], 200)
        detail = payload["data"]
        self.assertEqual(detail["cultural_connotation"], "和谐不是同一")
        self.assertEqual(detail["names"], [{"name": "和不同", "name_type": "short"}])
        self.assertEqual(detail["translations"][0]["language_code"], "en")
        self.assertEqual(detail["translations"][0]["region"], "global")
        self.assertEqual(
            detail["translations"][0]["contexts"][0]["context_code"], "academic"
        )
        self.assertEqual(detail["sources"][0]["title"], "论语")
        self.assertEqual(detail["sources"][0]["citation"], "《论语》子路篇")
        self.assertEqual(detail["sources"][0]["evidence"][0]["locator"], "子路篇")
        self.assertEqual(detail["contexts"][0]["context_code"], "children")
        self.assertEqual(detail["contexts"][0]["explanation"], "大家可以不一样")
        self.assertEqual(detail["cultural_notes"][0]["recommendation"], "同时说明 diversity")
        self.assertEqual(detail["relations"][0]["target_term_id"], self.related_term_id)
        self.assertEqual(detail["relations"][0]["direction"], "outgoing")
        self.assertEqual(len(detail["relations"]), 1)
        self.assertEqual(detail["topics"], [{
            "slug": "harmony",
            "title": "和谐",
            "summary": "理解和谐",
            "entry_type": "term",
            "item_title": "和而不同",
            "payload": {"weight": 1},
        }])

    def test_detail_returns_not_found_for_missing_or_unpublished_terms(self):
        for term_id in (self.hidden_term_id, 99999):
            with self.subTest(term_id=term_id):
                response = self.client.get(f"/api/v1/terms/{term_id}")
                self.assertEqual(response.status_code, 404)
                self.assertEqual(
                    response.get_json(),
                    {"code": 404, "message": "术语不存在或尚未发布"},
                )
