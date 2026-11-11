"""Validate and reconcile curated Huaihe people and herb topic entries."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from openpyxl import load_workbook
from sqlalchemy import select

from ..models import Topic, TopicItem
from .master_catalog_import import normalize_name, normalize_text


MATERIALS_CATALOG_KEY = "huaihe_materials_2026_11_11"
PERSON_SHEET = "文化人物（21位）"
HERB_SHEET = "淮河本草（20味）"


class HuaiheMaterialsValidationError(ValueError):
    """Raised when the curated workbook is incomplete or ambiguous."""


@dataclass(frozen=True)
class HuaiheMaterialRow:
    row_number: int
    original_item_id: str
    entry_type: str
    title: str
    payload: dict[str, str]


@dataclass(frozen=True)
class HuaiheMaterialsData:
    rows: tuple[HuaiheMaterialRow, ...]


@dataclass(frozen=True)
class HuaiheMaterialsImportReport:
    source_rows: int
    people: int
    herbs: int
    created: int
    updated: int
    removed: int


def _read_sheet(sheet, required_headers: tuple[str, ...], entry_type: str):
    header_values = next(sheet.iter_rows(min_row=4, max_row=4, values_only=True), ())
    headers = [normalize_name(value) for value in header_values]
    missing = [header for header in required_headers if normalize_name(header) not in headers]
    if missing:
        raise HuaiheMaterialsValidationError(
            f"工作表“{sheet.title}”缺少必需列：{'、'.join(missing)}"
        )
    indices = {header: headers.index(normalize_name(header)) for header in required_headers}
    rows = []
    for row_number, values in enumerate(sheet.iter_rows(min_row=5, values_only=True), start=5):
        if not any(normalize_text(value) for value in values):
            continue
        raw = {header: values[index] if index < len(values) else None for header, index in indices.items()}
        for header in required_headers:
            if not normalize_text(raw[header]):
                raise HuaiheMaterialsValidationError(
                    f"工作表“{sheet.title}”第 {row_number} 行的“{header}”不能为空"
                )
        if entry_type == "person":
            title = normalize_name(raw["姓名"])
            payload = {
                "分类": normalize_text(raw["分类"]),
                "百度链接": normalize_text(raw["百度百科链接"]),
            }
        else:
            title = normalize_name(raw["条目名"])
            payload = {
                "中文品名": normalize_text(raw["中文品名"]),
                "官方译法（英文）": normalize_text(raw["官方译法（英文）"]),
                "法语译法": normalize_text(raw["法语译法"]),
            }
        rows.append(HuaiheMaterialRow(
            row_number=row_number,
            original_item_id=normalize_text(raw["原站条目ID"]),
            entry_type=entry_type,
            title=title,
            payload=payload,
        ))
    return rows


def load_huaihe_materials(path: Path) -> HuaiheMaterialsData:
    workbook_path = Path(path)
    if not workbook_path.is_file():
        raise HuaiheMaterialsValidationError(f"找不到淮河人物与本草表：{workbook_path}")
    workbook = load_workbook(workbook_path, read_only=True, data_only=True)
    try:
        for sheet_name in (PERSON_SHEET, HERB_SHEET):
            if sheet_name not in workbook.sheetnames:
                raise HuaiheMaterialsValidationError(f"工作簿缺少“{sheet_name}”工作表")
        rows = [
            *_read_sheet(
                workbook[PERSON_SHEET],
                ("姓名", "分类", "百度百科链接", "原站条目ID"),
                "person",
            ),
            *_read_sheet(
                workbook[HERB_SHEET],
                ("条目名", "中文品名", "官方译法（英文）", "法语译法", "原站条目ID"),
                "herb",
            ),
        ]
    finally:
        workbook.close()
    identities = [(row.entry_type, row.original_item_id) for row in rows]
    titles = [(row.entry_type, normalize_name(row.title)) for row in rows]
    if len(identities) != len(set(identities)):
        raise HuaiheMaterialsValidationError("人物与本草表存在重复的原站条目ID")
    if len(titles) != len(set(titles)):
        raise HuaiheMaterialsValidationError("人物与本草表存在重复条目名")
    return HuaiheMaterialsData(rows=tuple(rows))


def import_huaihe_materials(session, materials: HuaiheMaterialsData):
    topic = session.scalar(select(Topic).where(Topic.slug == "huaihe-culture"))
    if topic is None:
        topic = Topic(
            slug="huaihe-culture",
            title="淮河文化",
            summary="沿淮河水系，连接民俗、本草、历史人物与地域表达。",
            status="published",
        )
        session.add(topic)
        session.flush()

    existing = list(session.scalars(
        select(TopicItem).where(
            TopicItem.topic_id == topic.id,
            TopicItem.entry_type.in_(("person", "herb")),
        )
    ))
    by_database_id = {(item.entry_type, str(item.id)): item for item in existing}
    by_title = {(item.entry_type, normalize_name(item.title)): item for item in existing}
    selected: set[int] = set()
    created = updated = 0
    for row in materials.rows:
        item = by_database_id.get((row.entry_type, row.original_item_id))
        if item is None:
            item = by_title.get((row.entry_type, normalize_name(row.title)))
        if item is None:
            item = TopicItem(topic=topic, entry_type=row.entry_type)
            session.add(item)
            session.flush()
            created += 1
        else:
            updated += 1
        item.term = None
        item.title = row.title
        item.payload = {
            **row.payload,
            "原站条目ID": row.original_item_id,
            "数据批次": MATERIALS_CATALOG_KEY,
        }
        if not item.legacy_table:
            item.legacy_table = MATERIALS_CATALOG_KEY
            item.legacy_id = f"{row.entry_type}:{row.original_item_id}"
        selected.add(item.id)

    removed = 0
    for item in existing:
        if item.id not in selected:
            session.delete(item)
            removed += 1
    session.flush()
    return HuaiheMaterialsImportReport(
        source_rows=len(materials.rows),
        people=sum(row.entry_type == "person" for row in materials.rows),
        herbs=sum(row.entry_type == "herb" for row in materials.rows),
        created=created,
        updated=updated,
        removed=removed,
    )
