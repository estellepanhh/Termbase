import tempfile
import unittest
from pathlib import Path

from openpyxl import Workbook

from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.models import (
    Context, Language, ReviewCase, ReviewCaseTerm, Source, Term, TermContext,
    TermRelation, Topic, TopicItem, Translation,
)
from termbase_app.services.master_catalog_import import (
    CatalogValidationError,
    MASTER_CATALOG_KEY,
    PREVIOUS_MASTER_CATALOG_KEYS,
    TOPIC_DEFINITIONS,
    clear_term_catalog,
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
    "儿童版解释",
    "场景标签",
    "释义条数",
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
        "小朋友也能听懂的花鼓灯解释。",
        "文化传播、节庆活动、儿童",
        1,
    ]


class MasterCatalogReaderTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.path = Path(self.temp_dir.name) / "catalog.xlsx"

    def tearDown(self):
        self.temp_dir.cleanup()

    def write_workbook(self, headers=HEADERS, rows=None, *, definition_rows=None, scene_rows=None):
        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "术语总表"
        sheet.append(headers)
        source_rows = rows or [catalog_row()]
        for row in source_rows:
            sheet.append(row)
        definitions = workbook.create_sheet("释义明细")
        definitions.append(["说明"])
        definitions.append(["来源"])
        definitions.append(["序号", "专题（专区）", "术语名称", "第几条", "释义内容", "来源记录ID", "来源分类"])
        for row in definition_rows or [
            [item[0], item[1], item[2], 1, item[13], f"source-{item[0]}", item[4]]
            for item in source_rows
        ]:
            definitions.append(row)
        scenes = workbook.create_sheet("场景明细")
        scenes.append(["说明"])
        scenes.append(["来源"])
        scenes.append(["序号", "专题（专区）", "术语名称", "场景名称", "受众", "场景说明", "例句", "扩展解释", "类型"])
        for row in scene_rows or [
            [item[0], item[1], item[2], "文化传播", "公众", "传播说明", "示例", None, "专题场景"]
            for item in source_rows
        ]:
            scenes.append(row)
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
        self.assertEqual(row.scenes, ("文化传播", "节庆活动", "儿童"))
        self.assertEqual(row.tags, ("民俗", "舞蹈"))

    def test_loads_definition_and_scene_details_by_sequence_without_using_scene_category(self):
        row = catalog_row()
        row[5] = "不得导入的场景分类"
        row[16] = "国际传播、儿童"
        row[17] = 2
        self.write_workbook(
            rows=[row],
            definition_rows=[
                [1, "淮河文化", "花鼓灯", 1, "第一条释义", 101, "民俗"],
                [1, "淮河文化", "花鼓灯", 2, "第二条释义", 102, "舞蹈"],
            ],
            scene_rows=[
                [1, "淮河文化", "花鼓灯", "国际传播", "海外公众", "用于介绍", "例句", "扩展", "专题场景"],
                [1, "淮河文化", "花鼓灯", "儿童", None, None, None, "儿童扩展", None],
            ],
        )

        loaded = load_catalog(self.path).rows[0]

        self.assertEqual(loaded.scenes, ("国际传播", "儿童"))
        self.assertNotIn("不得导入的场景分类", loaded.scenes)
        self.assertEqual([item.content for item in loaded.definitions], ["第一条释义", "第二条释义"])
        self.assertEqual(loaded.definitions[1].source_record_id, "102")
        self.assertEqual(loaded.scene_details[0].audience, "海外公众")
        self.assertEqual(loaded.scene_details[1].extended_explanation, "儿童扩展")
        self.assertEqual(loaded.child_explanation, "小朋友也能听懂的花鼓灯解释。")

    def test_rejects_definition_count_mismatch(self):
        row = catalog_row()
        row[17] = 2
        self.write_workbook(rows=[row])

        with self.assertRaisesRegex(CatalogValidationError, "释义条数"):
            load_catalog(self.path)

    def test_real_release_workbook_has_complete_related_rows(self):
        release = Path(__file__).parent.parent / "data" / "副本术语库导入版.xlsx"

        catalog = load_catalog(release)

        self.assertEqual(len(catalog.rows), 835)
        self.assertEqual(catalog.canonical_term_count, 828)
        self.assertEqual(sum(len(row.definitions) for row in catalog.rows), 987)
        self.assertEqual(sum(len(row.scene_details) for row in catalog.rows), 2387)
        self.assertEqual(catalog.rows[741].translations["ru"], "Линьцюаньская акробатика")
        self.assertTrue(all(row.child_explanation for row in catalog.rows))

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
        definitions = workbook.create_sheet("释义明细")
        definitions.append(["说明"])
        definitions.append(["来源"])
        definitions.append(["序号", "专题（专区）", "术语名称", "第几条", "释义内容", "来源记录ID", "来源分类"])
        scenes = workbook.create_sheet("场景明细")
        scenes.append(["说明"])
        scenes.append(["来源"])
        scenes.append(["序号", "专题（专区）", "术语名称", "场景名称", "受众", "场景说明", "例句", "扩展解释", "类型"])
        for row in rows:
            definitions.append([row[0], row[1], row[2], 1, row[13], f"source-{row[0]}", row[4]])
            scenes.append([row[0], row[1], row[2], "文化传播", "公众", "传播说明", "示例", None, "专题场景"])
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

    def test_clear_term_catalog_removes_term_data_but_preserves_topics_materials_and_review_cases(self):
        topic = Topic(slug="huaihe-culture", title="淮河文化", status="published")
        first = Term(preferred_name_zh="旧术语一", status="published")
        second = Term(preferred_name_zh="旧术语二", status="published")
        language = Language(code="en", name_zh="英语", name_en="English")
        source = Source(title="旧来源", citation="旧来源")
        context = Context(code="old-scene", name_zh="旧场景")
        first.translations.append(Translation(language=language, text="old term"))
        first.sources.append(source)
        first.contexts.append(TermContext(context=context, explanation="旧解释"))
        db.session.add_all([
            topic, first, second,
            TopicItem(topic=topic, term=first, entry_type="term", title="旧术语一"),
            TopicItem(topic=topic, entry_type="person", title="刘安", payload={"分类": "人物"}),
            TopicItem(topic=topic, entry_type="herb", title="亳菊", payload={"中文品名": "亳菊"}),
            TermRelation(source_term=first, target_term=second, relation_type="related"),
        ])
        review = ReviewCase(
            source_request_id="request-1", title="保留案例", source_text="旧术语一",
            audience="general", scenario="web", style="plain", locale="global",
            ai_snapshot={},
        )
        review.term_links.append(ReviewCaseTerm(term=first, position=1))
        db.session.add(review)
        db.session.flush()

        report = clear_term_catalog(db.session)
        db.session.flush()

        self.assertEqual(report.terms, 2)
        self.assertEqual(db.session.scalar(db.select(db.func.count(Term.id))), 0)
        self.assertEqual(db.session.scalar(db.select(db.func.count(Translation.id))), 0)
        self.assertEqual(db.session.scalar(db.select(db.func.count(Source.id))), 0)
        self.assertEqual(db.session.scalar(db.select(db.func.count(Context.id))), 0)
        self.assertEqual(db.session.scalar(db.select(db.func.count(ReviewCase.id))), 1)
        self.assertEqual(db.session.scalar(db.select(db.func.count(ReviewCaseTerm.case_id))), 0)
        remaining = list(db.session.scalars(db.select(TopicItem).order_by(TopicItem.entry_type)))
        self.assertEqual([(item.entry_type, item.title) for item in remaining], [("herb", "亳菊"), ("person", "刘安")])

    def test_real_release_import_creates_one_record_per_sequence_with_all_details(self):
        release = Path(__file__).parent.parent / "data" / "副本术语库导入版.xlsx"
        catalog = load_catalog(release)

        clear_term_catalog(db.session)
        report = import_master_catalog(db.session, catalog)
        db.session.flush()

        self.assertEqual(report.source_rows, 835)
        self.assertEqual(report.term_records, 835)
        self.assertEqual(report.canonical_terms, 828)
        self.assertEqual(report.definitions, 987)
        self.assertEqual(report.scene_details, 2387)
        self.assertEqual(db.session.scalar(db.select(db.func.count(Term.id))), 835)
        self.assertEqual(db.session.scalar(db.select(db.func.count(Translation.id))), 5010)
        self.assertEqual(
            db.session.scalar(db.select(db.func.count(TopicItem.id)).where(TopicItem.entry_type == "term")),
            835,
        )
        child = db.session.scalar(db.select(Context).where(Context.code == "children"))
        self.assertIsNotNone(child)
        self.assertEqual(
            db.session.scalar(db.select(db.func.count(TermContext.term_id)).where(TermContext.context_id == child.id)),
            835,
        )
        first = db.session.scalar(db.select(Term).where(Term.legacy_id == "1"))
        self.assertEqual(len(first.legacy_payload[MASTER_CATALOG_KEY]["definition_details"]), 1)
        self.assertEqual(len(first.legacy_payload[MASTER_CATALOG_KEY]["scene_details"]), 3)

    def test_preserves_duplicate_name_rows_as_separate_sequence_records(self):
        first = catalog_row(1, "淮河文化", "泗州戏")
        second = catalog_row(2, "中华优秀传统文化", "泗州戏")
        second[7] = "Sizhou Opera"

        report = import_master_catalog(db.session, self.catalog([first, second]))
        db.session.flush()

        self.assertEqual(db.session.scalar(db.select(db.func.count(Term.id))), 2)
        self.assertEqual(
            [item.preferred_name_zh for item in db.session.scalars(db.select(Term).order_by(Term.id))],
            ["泗州戏", "泗州戏"],
        )
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
                ("Sizhou Opera", "recommended", "reviewed"),
            ],
        )
        self.assertEqual(report.source_rows, 2)
        self.assertEqual(report.term_records, 2)
        self.assertEqual(report.canonical_terms, 1)

    def test_imports_user_facing_sources_and_scene_contexts(self):
        import_master_catalog(db.session, self.catalog([catalog_row()]))
        db.session.flush()

        source = db.session.scalar(db.select(Source))
        contexts = list(db.session.scalars(db.select(Context).order_by(Context.name_zh)))
        self.assertEqual(source.title, "国家级非物质文化遗产名录")
        self.assertEqual(source.citation, "国家级非物质文化遗产名录；地方文化志")
        self.assertEqual(source.authority_level, "reviewed")
        self.assertEqual([item.name_zh for item in contexts], ["儿童", "文化传播", "节庆活动"])

    def test_does_not_reuse_unmanaged_term_and_managed_import_is_idempotent(self):
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

        self.assertEqual(first_counts, (2, 6, 1, 1))
        self.assertEqual(second_counts, first_counts)
        unmanaged = db.session.scalar(db.select(Term).where(Term.legacy_table.is_(None)))
        managed = db.session.scalar(db.select(Term).where(Term.legacy_table == MASTER_CATALOG_KEY))
        self.assertTrue(unmanaged.legacy_payload["preserve"])
        self.assertEqual(managed.legacy_id, "1")
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
        self.assertEqual(report.contexts, 3)

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
            legacy_id="1",
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
        self.assertEqual({link.context.name_zh for link in contexts}, {"儿童", "文化传播", "节庆活动"})
        self.assertEqual(stale_item.legacy_table, MASTER_CATALOG_KEY)


if __name__ == "__main__":
    unittest.main()
