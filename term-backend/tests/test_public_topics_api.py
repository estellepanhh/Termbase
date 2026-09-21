import unittest

from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.models import Language, Term, Topic, TopicItem, Translation


class PublicTopicsApiTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:",
        })
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        self.client = self.app.test_client()

        english = Language(code="en", name_zh="英语", name_en="English")
        term = Term(
            preferred_name_zh="淮河文化",
            definition_zh="淮河流域形成的地域文化传统。",
            term_level="地域层",
            culture_category="地方文化",
            status="published",
        )
        Translation(
            term=term,
            language=english,
            text="Huaihe culture",
            translation_type="recommended",
            review_status="reviewed",
        )
        hidden_term = Term(preferred_name_zh="未发布术语", status="draft")
        topic = Topic(
            slug="huaihe-culture",
            title="淮河文化",
            summary="淮河流域文化专题",
            status="published",
        )
        TopicItem(topic=topic, term=term, entry_type="term", title="淮河文化")
        TopicItem(
            topic=topic,
            entry_type="person",
            title="管仲",
            payload={
                "分类": "人物",
                "百度链接": "https://example.test/person",
                "简介": "尚未逐字段审定的内容",
                "internal_note": "不得公开",
            },
        )
        TopicItem(topic=topic, term=hidden_term, entry_type="term", title="隐藏术语")
        draft_topic = Topic(slug="draft-topic", title="草稿专题", status="draft")
        TopicItem(topic=draft_topic, term=term, entry_type="term", title="不应公开")
        db.session.add_all([english, term, hidden_term, topic, draft_topic])
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()

    def test_list_returns_only_published_topics_with_public_counts(self):
        response = self.client.get("/api/topics")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {
            "code": 200,
            "data": [{
                "slug": "huaihe-culture",
                "title": "淮河文化",
                "summary": "淮河流域文化专题",
                "item_count": 2,
                "term_count": 1,
                "entry_type_counts": {"person": 1, "term": 1},
            }],
        })

    def test_detail_orders_entries_and_serializes_term_research_data(self):
        response = self.client.get("/api/topics/huaihe-culture")

        self.assertEqual(response.status_code, 200)
        detail = response.get_json()["data"]
        self.assertEqual([item["entry_type"] for item in detail["items"]], ["term", "person"])
        self.assertEqual(detail["items"][0]["term"], {
            "id": detail["items"][0]["term"]["id"],
            "preferred_name_zh": "淮河文化",
            "definition_zh": "淮河流域形成的地域文化传统。",
            "term_level": "地域层",
            "culture_category": "地方文化",
            "recommended_translation": "Huaihe culture",
        })
        self.assertEqual(detail["items"][1]["fields"], {
            "分类": "人物",
            "百度链接": "https://example.test/person",
        })
        self.assertNotIn("internal_note", detail["items"][1]["fields"])
        self.assertNotIn("简介", detail["items"][1]["fields"])

    def test_detail_excludes_unpublished_linked_terms_from_counts_and_items(self):
        detail = self.client.get("/api/topics/huaihe-culture").get_json()["data"]

        self.assertEqual(detail["item_count"], 2)
        self.assertEqual(detail["term_count"], 1)
        self.assertNotIn("未发布术语", str(detail))

    def test_term_count_counts_unique_linked_terms(self):
        topic = db.session.query(Topic).filter_by(slug="huaihe-culture").one()
        term = db.session.query(Term).filter_by(preferred_name_zh="淮河文化").one()
        db.session.add(TopicItem(
            topic=topic,
            term=term,
            entry_type="term",
            title="淮河文化补充材料",
        ))
        db.session.commit()

        detail = self.client.get("/api/topics/huaihe-culture").get_json()["data"]

        self.assertEqual(detail["item_count"], 3)
        self.assertEqual(detail["term_count"], 1)

    def test_detail_returns_not_found_for_missing_or_draft_topic(self):
        for slug in ("draft-topic", "missing"):
            with self.subTest(slug=slug):
                response = self.client.get(f"/api/topics/{slug}")
                self.assertEqual(response.status_code, 404)
                self.assertEqual(
                    response.get_json(),
                    {"code": 404, "message": "专题不存在或尚未发布"},
                )


if __name__ == "__main__":
    unittest.main()
