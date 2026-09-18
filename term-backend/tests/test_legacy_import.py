import math
import unittest

from sqlalchemy import text

from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.models import Source, Term, Topic, TopicItem, Translation
from termbase_app.services.legacy_import import clean, import_legacy_knowledge


class LegacyImportTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(
            {
                "TESTING": True,
                "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:",
            }
        )
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        self._create_legacy_tables()
        self._insert_legacy_rows()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()

    def _create_legacy_tables(self):
        db.session.execute(
            text(
                '''
                CREATE TABLE terms (
                    id INTEGER PRIMARY KEY,
                    "术语名称" TEXT,
                    "术语层级" TEXT,
                    "文化分类" TEXT,
                    "场景分类" TEXT,
                    "官方译法（英文）" TEXT,
                    "官方译法（小语种）" TEXT,
                    "文化内涵" TEXT,
                    "来源" TEXT,
                    "儿童解释" TEXT
                )
                '''
            )
        )
        db.session.execute(
            text(
                '''
                CREATE TABLE huaihe_terms (
                    id INTEGER PRIMARY KEY,
                    "术语名称" TEXT,
                    "术语层级" TEXT,
                    "文化分类" TEXT,
                    "场景分类" TEXT,
                    "官方译法（英文）" TEXT,
                    "官方译法（小语种）" TEXT,
                    "文化内涵" TEXT,
                    "来源" TEXT,
                    "儿童解释" TEXT
                )
                '''
            )
        )
        db.session.execute(
            text(
                '''
                CREATE TABLE huaihe_figures (
                    "人物" TEXT PRIMARY KEY,
                    "百度链接" TEXT,
                    "分类" TEXT
                )
                '''
            )
        )
        db.session.execute(
            text(
                '''
                CREATE TABLE huaihe_herbs (
                    id INTEGER PRIMARY KEY,
                    "中文品名" TEXT,
                    "官方译法（英文）" TEXT,
                    "法语译法" TEXT
                )
                '''
            )
        )

    def _insert_legacy_rows(self):
        db.session.execute(
            text(
                '''
                INSERT INTO terms VALUES
                (1, '和而不同', '本源层', '中华优秀传统文化', 'International Exchange',
                 'harmony in diversity', 'harmonie dans la diversite',
                 '尊重差异、追求和谐', '论语', '大家可以不一样')
                '''
            )
        )
        db.session.execute(
            text(
                '''
                INSERT INTO huaihe_terms VALUES
                (8, '淮河文化', '地域层', '地方文化', '旅游',
                 'Huaihe culture', '', '淮河流域的文化传统', '地方志', '认识家乡')
                '''
            )
        )
        db.session.execute(
            text(
                '''
                INSERT INTO huaihe_figures VALUES
                ('管仲', 'https://example.test/guan-zhong', '人物')
                '''
            )
        )
        db.session.execute(
            text(
                '''
                INSERT INTO huaihe_herbs VALUES
                (3, '金银花', 'honeysuckle', 'chevrefeuille')
                '''
            )
        )
        db.session.commit()

    def test_import_is_idempotent_and_preserves_legacy_content(self):
        first = import_legacy_knowledge(db.session)
        second = import_legacy_knowledge(db.session)

        self.assertEqual(first.terms_created, 2)
        self.assertEqual(first.translations_created, 3)
        self.assertEqual(first.sources_created, 2)
        self.assertEqual(first.topic_items_created, 3)
        self.assertEqual(first.skipped, 0)
        self.assertEqual(second.terms_created, 0)
        self.assertEqual(second.translations_created, 0)
        self.assertEqual(second.sources_created, 0)
        self.assertEqual(second.topic_items_created, 0)
        self.assertEqual(second.skipped, 4)
        self.assertEqual(db.session.query(Term).count(), 2)

        term = db.session.query(Term).filter_by(legacy_table="terms", legacy_id="1").one()
        self.assertEqual(term.status, "published")
        self.assertEqual(term.data_quality, "legacy_unreviewed")
        self.assertEqual(
            {(item.language.code, item.text) for item in term.translations},
            {("en", "harmony in diversity"), ("und", "harmonie dans la diversite")},
        )
        self.assertEqual(term.sources[0].legacy_value, "论语")
        self.assertEqual(term.contexts[0].context.code, "legacy-international-exchange")
        self.assertEqual(
            next(item for item in term.contexts if item.context.code == "children").explanation,
            "大家可以不一样",
        )

        topic = db.session.query(Topic).filter_by(slug="huaihe-culture").one()
        self.assertEqual(topic.status, "published")
        items = {item.entry_type: item for item in topic.items}
        self.assertEqual(items["term"].term.legacy_id, "8")
        self.assertEqual(items["person"].legacy_id, "管仲")
        self.assertEqual(items["person"].payload["百度链接"], "https://example.test/guan-zhong")
        self.assertEqual(items["herb"].payload["id"], 3)
        self.assertEqual(items["herb"].payload["法语译法"], "chevrefeuille")
        self.assertEqual(db.session.query(TopicItem).count(), 3)
        self.assertEqual(db.session.query(Source).count(), 2)

    def test_clean_normalizes_missing_and_nan_values(self):
        self.assertEqual(clean(None), "")
        self.assertEqual(clean(math.nan), "")
        self.assertEqual(clean(" NaN "), "")
        self.assertEqual(clean("  淮河  "), "淮河")
