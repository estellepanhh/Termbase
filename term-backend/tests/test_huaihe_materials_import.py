import tempfile
import unittest
from pathlib import Path

from openpyxl import Workbook

from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.models import Term, Topic, TopicItem
from termbase_app.services.huaihe_materials_import import (
    HuaiheMaterialsValidationError,
    import_huaihe_materials,
    load_huaihe_materials,
)
from scripts.import_huaihe_materials import build_parser, run_materials_import
from scripts.import_catalog_release import build_parser as build_release_parser, run_release_import
from termbase_app.services.master_catalog_import import load_catalog


class HuaiheMaterialsImportTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:"})
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        self.temp_dir = tempfile.TemporaryDirectory()
        self.path = Path(self.temp_dir.name) / "materials.xlsx"

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()
        self.temp_dir.cleanup()

    def write_workbook(self, *, missing_person_header=False):
        workbook = Workbook()
        people = workbook.active
        people.title = "文化人物（21位）"
        people.append(["说明"])
        people.append(["来源"])
        people.append([])
        people.append([
            "姓名", "分类", "链接" if missing_person_header else "百度百科链接",
            "原站条目ID", "英文（参考）", "法文（参考）",
        ])
        people.append(["刘安", "思想家", "https://example.test/liu-an", 101, "Liu An", "Liu An"])
        herbs = workbook.create_sheet("淮河本草（20味）")
        herbs.append(["说明"])
        herbs.append(["来源"])
        herbs.append([])
        herbs.append(["条目名", "中文品名", "官方译法（英文）", "法语译法", "原站条目ID"])
        herbs.append(["亳菊", "亳菊", "Bozhou Chrysanthemum", "Chrysanthème de Bozhou", 122])
        workbook.save(self.path)

    def test_loads_people_and_herbs_from_curated_sheets(self):
        self.write_workbook()

        materials = load_huaihe_materials(self.path)

        self.assertEqual([(row.entry_type, row.title) for row in materials.rows], [("person", "刘安"), ("herb", "亳菊")])
        self.assertEqual(materials.rows[0].payload["英文（参考）"], "Liu An")
        self.assertEqual(materials.rows[0].payload["法文（参考）"], "Liu An")
        self.assertEqual(materials.rows[1].payload["法语译法"], "Chrysanthème de Bozhou")

    def test_real_release_workbook_has_all_41_rows_and_yellow_person_values(self):
        release = Path(__file__).parent.parent / "data" / "副本淮河文化人物与本草（网站专题条目·41条备.xlsx"

        materials = load_huaihe_materials(release)

        self.assertEqual(len(materials.rows), 41)
        self.assertEqual(sum(row.entry_type == "person" for row in materials.rows), 21)
        self.assertEqual(sum(row.entry_type == "herb" for row in materials.rows), 20)
        liu_an = next(row for row in materials.rows if row.title == "刘安")
        self.assertEqual(liu_an.payload["英文（参考）"], "Liu An")
        self.assertEqual(liu_an.payload["法文（参考）"], "Liu An")

    def test_rejects_missing_public_field_header(self):
        self.write_workbook(missing_person_header=True)

        with self.assertRaisesRegex(HuaiheMaterialsValidationError, "百度百科链接"):
            load_huaihe_materials(self.path)

    def test_fills_missing_materials_without_deleting_or_overwriting_existing_values(self):
        self.write_workbook()
        materials = load_huaihe_materials(self.path)
        topic = Topic(slug="huaihe-culture", title="淮河文化", status="published")
        person = TopicItem(
            topic=topic,
            entry_type="person",
            title="刘安",
            payload={"分类": "保留分类", "百度链接": "", "自定义备注": "保留备注"},
        )
        stale = TopicItem(topic=topic, entry_type="herb", title="旧本草", payload={})
        db.session.add_all([topic, person, stale])
        db.session.commit()

        first = import_huaihe_materials(db.session, materials)
        db.session.flush()
        second = import_huaihe_materials(db.session, materials)
        db.session.flush()

        items = list(db.session.scalars(
            db.select(TopicItem).order_by(TopicItem.entry_type, TopicItem.title)
        ))
        self.assertEqual((first.created, first.updated, first.removed), (1, 1, 0))
        self.assertEqual((second.created, second.updated, second.removed), (0, 2, 0))
        self.assertEqual(
            [(item.entry_type, item.title) for item in items],
            [("herb", "亳菊"), ("herb", "旧本草"), ("person", "刘安")],
        )
        self.assertEqual(person.payload["分类"], "保留分类")
        self.assertEqual(person.payload["百度链接"], "https://example.test/liu-an")
        self.assertEqual(person.payload["英文（参考）"], "Liu An")
        self.assertEqual(person.payload["自定义备注"], "保留备注")

    def test_cli_previews_by_default_and_only_apply_commits(self):
        self.write_workbook()
        materials = load_huaihe_materials(self.path)
        self.assertFalse(build_parser().parse_args([]).apply)

        run_materials_import(materials, apply=False)
        self.assertEqual(db.session.scalar(db.select(db.func.count(TopicItem.id))), 0)
        run_materials_import(materials, apply=True)
        self.assertEqual(db.session.scalar(db.select(db.func.count(TopicItem.id))), 2)

    def test_release_import_rolls_both_datasets_back_in_preview(self):
        self.write_workbook()
        materials = load_huaihe_materials(self.path)
        catalog_path = Path(__file__).parent.parent / "data" / "副本术语库导入版.xlsx"
        catalog = load_catalog(catalog_path)
        topic = Topic(slug="huaihe-culture", title="淮河文化", status="published")
        old_term = Term(preferred_name_zh="旧术语", status="published")
        person = TopicItem(topic=topic, entry_type="person", title="保留人物", payload={})
        db.session.add_all([topic, old_term, person])
        db.session.commit()

        run_release_import(catalog, materials, apply=False)

        self.assertEqual(db.session.scalar(db.select(db.func.count(Term.id))), 1)
        self.assertEqual(db.session.scalar(db.select(Term)).preferred_name_zh, "旧术语")
        self.assertEqual(db.session.scalar(db.select(db.func.count(TopicItem.id))), 1)
        self.assertEqual(db.session.scalar(db.select(TopicItem)).title, "保留人物")

    def test_real_release_apply_replaces_terms_and_reports_all_required_counts(self):
        data_dir = Path(__file__).parent.parent / "data"
        catalog = load_catalog(data_dir / "副本术语库导入版.xlsx")
        materials = load_huaihe_materials(
            data_dir / "副本淮河文化人物与本草（网站专题条目·41条备.xlsx"
        )

        db.session.add(Term(preferred_name_zh="必须被清除的旧术语", status="published"))
        db.session.commit()

        catalog_report, materials_report = run_release_import(catalog, materials, apply=True)

        self.assertEqual(
            (
                catalog_report.source_rows,
                catalog_report.term_records,
                catalog_report.definitions,
                catalog_report.scene_details,
                materials_report.people,
                materials_report.herbs,
            ),
            (835, 835, 987, 2387, 21, 20),
        )
        self.assertEqual(db.session.scalar(db.select(db.func.count(Term.id))), 835)
        self.assertIsNone(
            db.session.scalar(db.select(Term).where(Term.preferred_name_zh == "必须被清除的旧术语"))
        )

    def test_release_cli_defaults_to_new_workbooks(self):
        args = build_release_parser().parse_args([])

        self.assertEqual(args.catalog.name, "副本术语库导入版.xlsx")
        self.assertEqual(args.materials.name, "副本淮河文化人物与本草（网站专题条目·41条备.xlsx")

    def test_publish_script_parses_dotenv_without_sourcing_it_as_shell(self):
        script = (
            Path(__file__).parent.parent / "scripts" / "publish_catalog_release.sh"
        ).read_text(encoding="utf-8")

        self.assertNotIn('source "${backend_dir}/.env"', script)
        self.assertIn("dotenv_values", script)


if __name__ == "__main__":
    unittest.main()
