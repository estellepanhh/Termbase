import tempfile
import unittest
from pathlib import Path

from openpyxl import Workbook

from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.models import Topic, TopicItem
from termbase_app.services.huaihe_materials_import import (
    HuaiheMaterialsValidationError,
    import_huaihe_materials,
    load_huaihe_materials,
)
from scripts.import_huaihe_materials import build_parser, run_materials_import
from scripts.import_catalog_release import run_release_import
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
        people.append(["姓名", "分类", "链接" if missing_person_header else "百度百科链接", "原站条目ID"])
        people.append(["刘安", "思想家", "https://example.test/liu-an", 101])
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
        self.assertEqual(materials.rows[1].payload["法语译法"], "Chrysanthème de Bozhou")

    def test_rejects_missing_public_field_header(self):
        self.write_workbook(missing_person_header=True)

        with self.assertRaisesRegex(HuaiheMaterialsValidationError, "百度百科链接"):
            load_huaihe_materials(self.path)

    def test_reconciles_existing_materials_and_is_idempotent(self):
        self.write_workbook()
        materials = load_huaihe_materials(self.path)
        topic = Topic(slug="huaihe-culture", title="淮河文化", status="published")
        person = TopicItem(topic=topic, entry_type="person", title="刘安", payload={"分类": "旧分类"})
        stale = TopicItem(topic=topic, entry_type="herb", title="旧本草", payload={})
        db.session.add_all([topic, person, stale])
        db.session.commit()

        first = import_huaihe_materials(db.session, materials)
        db.session.flush()
        second = import_huaihe_materials(db.session, materials)
        db.session.flush()

        items = list(db.session.scalars(db.select(TopicItem).order_by(TopicItem.entry_type)))
        self.assertEqual((first.created, first.updated, first.removed), (1, 1, 1))
        self.assertEqual((second.created, second.updated, second.removed), (0, 2, 0))
        self.assertEqual([(item.entry_type, item.title) for item in items], [("herb", "亳菊"), ("person", "刘安")])
        self.assertEqual(person.payload["分类"], "思想家")

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
        catalog_path = Path(__file__).parent.parent / "data" / "术语库总表（835条·2026-11-11）.xlsx"
        catalog = load_catalog(catalog_path)

        run_release_import(catalog, materials, apply=False)

        self.assertEqual(db.session.scalar(db.select(db.func.count(TopicItem.id))), 0)


if __name__ == "__main__":
    unittest.main()
