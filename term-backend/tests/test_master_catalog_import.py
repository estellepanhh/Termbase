import tempfile
import unittest
from pathlib import Path

from openpyxl import Workbook

from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.models import Context, Language, Source, Term, TermContext, Topic, TopicItem, Translation
from termbase_app.services.master_catalog_import import (
    CatalogValidationError,
    MASTER_CATALOG_KEY,
    PREVIOUS_MASTER_CATALOG_KEYS,
    TOPIC_DEFINITIONS,
    import_master_catalog,
    load_catalog,
)
from scripts.import_master_catalog import build_parser, run_catalog_import


HEADERS = [
    "序号",
    "专题（专区）",
    "术语名称",
    "术语层级",
    "文化分类",
    "场景分类",
    "筛选标签",
    "英文",
    "法语",
    "俄语",
    "西班牙语",
    "阿拉伯语",
    "日语",
    "文化内涵",
    "来源",
]


def catalog_row(sequence=1, topic="淮河文化", term="花鼓灯"):
    return [
        sequence,
        topic,
        term,
        "核心层",
        "中华优秀传统文化",
        "文化传播、节庆活动",
        "民俗,舞蹈",
        "flower-drum lantern dance",
        "danse des lanternes-tambours",
        "танец с барабанами и фонарями",
        "danza de faroles y tambores",
        "رقصة فوانيس الطبول",
        "花鼓灯",
        "淮河流域代表性民间舞蹈；体现沿淮生活记忆。",
        "国家级非物质文化遗产名录；地方文化志",
    ]


class MasterCatalogReaderTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.path = Path(self.temp_dir.name) / "catalog.xlsx"

    def tearDown(self):
        self.temp_dir.cleanup()

    def write_workbook(self, headers=HEADERS, rows=None):
        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "术语总表"
        sheet.append(headers)
        for row in rows or [catalog_row()]:
            sheet.append(row)
        workbook.save(self.path)

    def test_missing_required_header_is_rejected(self):
        self.write_workbook(headers=[header for header in HEADERS if header != "日语"])

        with self.assertRaisesRegex(CatalogValidationError, "日语"):
            load_catalog(self.path)

    def test_blank_required_cell_identifies_excel_row_and_column(self):
        row = catalog_row()
        row[13] = ""
        self.write_workbook(rows=[row])

        with self.assertRaisesRegex(CatalogValidationError, "第 2 行.*文化内涵"):
            load_catalog(self.path)

    def test_extracts_six_languages_and_splits_scene_labels(self):
        self.write_workbook()

        row = load_catalog(self.path).rows[0]

        self.assertEqual(
            row.translations,
            {
                "en": "flower-drum lantern dance",
                "fr": "danse des lanternes-tambours",
                "ru": "танец с барабанами и фонарями",
                "es": "danza de faroles y tambores",
                "ar": "رقصة فوانيس الطبول",
                "ja": "花鼓灯",
            },
        )
        self.assertEqual(row.scenes, ("文化传播", "节庆活动"))
        self.assertEqual(row.tags, ("民俗", "舞蹈"))

    def test_preserves_reviewed_display_punctuation(self):
        self.write_workbook(rows=[catalog_row(topic="长江文化（安徽段）")])

        row = load_catalog(self.path).rows[0]

        self.assertEqual(row.topic_name, "长江文化（安徽段）")
        self.assertEqual(row.source_text, "国家级非物质文化遗产名录；地方文化志")

    def test_reports_literal_topic_counts_and_normalized_duplicate_names(self):
        self.write_workbook(
            rows=[
                catalog_row(1, "淮河文化", " 花鼓灯 "),
                catalog_row(2, "中华优秀传统文化", "花鼓灯"),
                catalog_row(3, "徽州文化", "徽墨"),
            ]
        )

        catalog = load_catalog(self.path)

        self.assertEqual(
            catalog.topic_counts,
            {"淮河文化": 1, "中华优秀传统文化": 1, "徽州文化": 1},
        )
        self.assertEqual(catalog.canonical_term_count, 2)
        self.assertEqual(catalog.duplicate_names, ("花鼓灯",))
        self.assertEqual(catalog.rows[0].term_name, "花鼓灯")


class MasterCatalogImportTests(unittest.TestCase):
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
        self.temp_dir = tempfile.TemporaryDirectory()
        self.path = Path(self.temp_dir.name) / "catalog.xlsx"

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()
        self.temp_dir.cleanup()

    def catalog(self, rows):
        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "术语总表"
        sheet.append(HEADERS)
        for row in rows:
            sheet.append(row)
        workbook.save(self.path)
        return load_catalog(self.path)

    def test_creates_all_ten_stable_topic_routes(self):
        topic_names = [
            "徽州文化",
            "长江文化（安徽段）",
            "淮河文化",
            "黄梅戏文化",
            "大运河文化（安徽段）",
            "黄河文化",
            "社会主义先进文化",
            "革命文化",
            "近现代文化",
            "中华优秀传统文化",
        ]
        rows = [catalog_row(index, topic, f"示例术语{index}") for index, topic in enumerate(topic_names, 1)]

        import_master_catalog(db.session, self.catalog(rows))
        db.session.flush()

        self.assertEqual(
            {topic.title: topic.slug for topic in db.session.scalars(db.select(Topic))},
            {
                "徽州文化": "huizhou-culture",
                "长江文化（安徽段）": "yangtze-culture-anhui",
                "淮河文化": "huaihe-culture",
                "黄梅戏文化": "huangmei-opera-culture",
                "大运河文化（安徽段）": "grand-canal-culture-anhui",
                "黄河文化": "yellow-river-culture",
                "社会主义先进文化": "advanced-socialist-culture",
                "革命文化": "revolutionary-culture",
                "近现代文化": "modern-contemporary-culture",
                "中华优秀传统文化": "excellent-traditional-chinese-culture",
            },
        )
        self.assertEqual(len(TOPIC_DEFINITIONS), 10)

    def test_merges_cross_topic_term_and_preserves_translation_conflict(self):
        first = catalog_row(1, "淮河文化", "泗州戏")
        second = catalog_row(2, "中华优秀传统文化", "泗州戏")
        second[7] = "Sizhou Opera"

        report = import_master_catalog(db.session, self.catalog([first, second]))
        db.session.flush()

        term = db.session.scalar(db.select(Term))
        self.assertEqual(db.session.scalar(db.select(db.func.count(Term.id))), 1)
        self.assertEqual(term.preferred_name_zh, "泗州戏")
        self.assertEqual(db.session.scalar(db.select(db.func.count(TopicItem.id))), 2)
        self.assertEqual(db.session.scalar(db.select(db.func.count(Language.id))), 6)
        english = list(
            db.session.scalars(
                db.select(Translation)
                .join(Language)
                .where(Language.code == "en")
                .order_by(Translation.id)
            )
        )
        self.assertEqual(
            [(item.text, item.translation_type, item.review_status) for item in english],
            [
                ("flower-drum lantern dance", "recommended", "reviewed"),
                ("Sizhou Opera", "acceptable", "reviewed"),
            ],
        )
        self.assertEqual(report.source_rows, 2)
        self.assertEqual(report.canonical_terms, 1)

    def test_imports_user_facing_sources_and_scene_contexts(self):
        import_master_catalog(db.session, self.catalog([catalog_row()]))
        db.session.flush()

        source = db.session.scalar(db.select(Source))
        contexts = list(db.session.scalars(db.select(Context).order_by(Context.name_zh)))
        self.assertEqual(source.title, "国家级非物质文化遗产名录")
        self.assertEqual(source.citation, "国家级非物质文化遗产名录；地方文化志")
        self.assertEqual(source.authority_level, "reviewed")
        self.assertEqual([item.name_zh for item in contexts], ["文化传播", "节庆活动"])

    def test_reuses_existing_term_removes_stale_master_link_and_is_idempotent(self):
        existing = Term(
            preferred_name_zh="花鼓灯",
            definition_zh="旧定义",
            status="published",
            legacy_payload={"preserve": True},
        )
        topic = Topic(slug="huaihe-culture", title="淮河文化", status="published")
        stale = TopicItem(
            topic=topic,
            entry_type="term",
            title="过期术语",
            legacy_table=MASTER_CATALOG_KEY,
            legacy_id="9999",
        )
        db.session.add_all([existing, topic, stale])
        db.session.flush()
        existing_id = existing.id
        catalog = self.catalog([catalog_row()])

        import_master_catalog(db.session, catalog)
        db.session.flush()
        first_counts = (
            db.session.scalar(db.select(db.func.count(Term.id))),
            db.session.scalar(db.select(db.func.count(Translation.id))),
            db.session.scalar(db.select(db.func.count(TopicItem.id))),
            db.session.scalar(db.select(db.func.count(Source.id))),
        )
        import_master_catalog(db.session, catalog)
        db.session.flush()
        second_counts = (
            db.session.scalar(db.select(db.func.count(Term.id))),
            db.session.scalar(db.select(db.func.count(Translation.id))),
            db.session.scalar(db.select(db.func.count(TopicItem.id))),
            db.session.scalar(db.select(db.func.count(Source.id))),
        )

        self.assertEqual(first_counts, (1, 6, 1, 1))
        self.assertEqual(second_counts, first_counts)
        self.assertEqual(db.session.scalar(db.select(Term)).id, existing_id)
        self.assertTrue(db.session.scalar(db.select(Term)).legacy_payload["preserve"])
        self.assertEqual(db.session.scalar(db.select(TopicItem)).title, "花鼓灯")

    def test_cli_defaults_to_preview_and_only_apply_commits(self):
        args = build_parser().parse_args([])
        self.assertFalse(args.apply)
        self.assertEqual(args.workbook.name, "术语库总表（835条·2026-11-11）.xlsx")
        catalog = self.catalog([catalog_row()])

        run_catalog_import(catalog, apply=False)
        self.assertEqual(db.session.scalar(db.select(db.func.count(Term.id))), 0)

        run_catalog_import(catalog, apply=True)
        self.assertEqual(db.session.scalar(db.select(db.func.count(Term.id))), 1)

    def test_report_excludes_unrelated_existing_sources_and_contexts(self):
        db.session.add_all([
            Source(title="旧来源", citation="不属于本次总表", source_type="legacy"),
            Context(code="legacy-scene", name_zh="旧场景"),
        ])
        db.session.flush()

        report = import_master_catalog(db.session, self.catalog([catalog_row()]))

        self.assertEqual(report.sources, 1)
        self.assertEqual(report.contexts, 2)

    def test_ignores_existing_languages_that_are_not_catalog_columns(self):
        db.session.add(Language(code="und", name_zh="未指定语言", name_en="Undetermined"))
        db.session.flush()

        report = import_master_catalog(db.session, self.catalog([catalog_row()]))

        self.assertEqual(report.translations, 6)
        self.assertEqual(
            {item.code for item in db.session.scalars(db.select(Language))},
            {"und", "en", "fr", "ru", "es", "ar", "ja"},
        )

    def test_replaces_values_and_links_managed_by_the_previous_catalog(self):
        old_key = PREVIOUS_MASTER_CATALOG_KEYS[0]
        english = Language(code="en", name_zh="英语", name_en="English")
        old_source = Source(title="旧来源", citation="旧来源")
        old_context = Context(code="old-scene", name_zh="旧场景")
        term = Term(
            preferred_name_zh="花鼓灯",
            status="published",
            legacy_table=old_key,
            legacy_id="花鼓灯",
            legacy_payload={old_key: {"rows": [{"英文": "old translation", "来源": "旧来源", "场景分类": "旧场景"}]}},
        )
        term.sources.append(old_source)
        term.translations.append(Translation(language=english, text="old translation", translation_type="recommended", review_status="reviewed"))
        term.contexts.append(TermContext(context=old_context))
        topic = Topic(slug="huaihe-culture", title="淮河文化", status="published")
        stale_item = TopicItem(topic=topic, term=term, entry_type="term", title="花鼓灯", legacy_table=old_key, legacy_id="1")
        db.session.add_all([english, term, topic, stale_item])
        db.session.flush()

        import_master_catalog(db.session, self.catalog([catalog_row()]))
        db.session.flush()

        self.assertEqual(term.legacy_table, MASTER_CATALOG_KEY)
        self.assertNotIn(old_key, term.legacy_payload)
        translations = list(db.session.scalars(
            db.select(Translation).where(Translation.term_id == term.id)
        ))
        contexts = list(db.session.scalars(
            db.select(TermContext).where(TermContext.term_id == term.id)
        ))
        self.assertEqual(len(translations), 6)
        self.assertEqual(
            [item.text for item in translations if item.language.code == "en"],
            ["flower-drum lantern dance"],
        )
        self.assertEqual([source.citation for source in term.sources], ["国家级非物质文化遗产名录；地方文化志"])
        self.assertEqual({link.context.name_zh for link in contexts}, {"文化传播", "节庆活动"})
        self.assertEqual(stale_item.legacy_table, MASTER_CATALOG_KEY)


if __name__ == "__main__":
    unittest.main()
