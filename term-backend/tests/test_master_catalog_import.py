import tempfile
import unittest
from pathlib import Path

from openpyxl import Workbook

from termbase_app.services.master_catalog_import import (
    CatalogValidationError,
    load_catalog,
)


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


if __name__ == "__main__":
    unittest.main()
