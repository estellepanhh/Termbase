import unittest

from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.models import Language, Term, Topic, Translation


EXPECTED_FIELDS = {
    "term_count",
    "translation_count",
    "language_count",
    "published_topic_count",
}


class ProjectOverviewApiTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:",
        })
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        self.client = self.app.test_client()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()

    def seed_overview_data(self):
        english = Language(code="en", name_zh="英语", name_en="English")
        french = Language(code="fr", name_zh="法语", name_en="French")
        harmony = Term(preferred_name_zh="和而不同", status="published")
        huaihe = Term(preferred_name_zh="淮河文化", status="published")
        db.session.add_all([
            english,
            french,
            harmony,
            huaihe,
            Translation(term=harmony, language=english, text="harmony in diversity"),
            Translation(term=huaihe, language=english, text="Huaihe culture"),
            Translation(term=huaihe, language=french, text="culture de la rivière Huai"),
            Topic(slug="huaihe-culture", title="淮河文化", status="published"),
            Topic(slug="draft-topic", title="草稿专题", status="draft"),
        ])
        db.session.commit()

    def test_overview_returns_public_counts(self):
        self.seed_overview_data()

        response = self.client.get("/api/project/overview")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {
            "code": 200,
            "data": {
                "term_count": 2,
                "translation_count": 3,
                "language_count": 2,
                "published_topic_count": 1,
            },
        })

    def test_overview_counts_each_language_once_and_excludes_draft_topics(self):
        self.seed_overview_data()

        overview = self.client.get("/api/project/overview").get_json()["data"]

        self.assertEqual(overview["translation_count"], 3)
        self.assertEqual(overview["language_count"], 2)
        self.assertEqual(overview["published_topic_count"], 1)

    def test_overview_returns_zero_counts_for_empty_database(self):
        response = self.client.get("/api/project/overview")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["data"], {
            "term_count": 0,
            "translation_count": 0,
            "language_count": 0,
            "published_topic_count": 0,
        })

    def test_overview_exposes_only_contract_fields(self):
        self.seed_overview_data()

        overview = self.client.get("/api/project/overview").get_json()["data"]

        self.assertEqual(set(overview), EXPECTED_FIELDS)


if __name__ == "__main__":
    unittest.main()
