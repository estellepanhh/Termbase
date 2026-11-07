"""Read and validate the reviewed multilingual master catalog workbook."""

from __future__ import annotations

import re
import unicodedata
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from openpyxl import load_workbook


REQUIRED_HEADERS = (
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
)

LANGUAGE_COLUMNS = {
    "英文": "en",
    "法语": "fr",
    "俄语": "ru",
    "西班牙语": "es",
    "阿拉伯语": "ar",
    "日语": "ja",
}

LIST_SEPARATOR = re.compile(r"\s*[,，、;；]\s*")
WHITESPACE = re.compile(r"\s+")


class CatalogValidationError(ValueError):
    """Raised when a master catalog workbook is incomplete or malformed."""


@dataclass(frozen=True)
class CatalogRow:
    row_number: int
    sequence: int
    topic_name: str
    term_name: str
    term_level: str
    culture_category: str
    scenes: tuple[str, ...]
    tags: tuple[str, ...]
    translations: dict[str, str]
    cultural_connotation: str
    source_text: str
    raw: dict[str, Any]


@dataclass(frozen=True)
class CatalogData:
    rows: tuple[CatalogRow, ...]
    topic_counts: dict[str, int]
    canonical_term_count: int
    duplicate_names: tuple[str, ...]


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    return WHITESPACE.sub(" ", unicodedata.normalize("NFKC", str(value))).strip()


def normalize_name(value: Any) -> str:
    return normalize_text(value)


def split_labels(value: Any) -> tuple[str, ...]:
    text = normalize_text(value)
    if not text:
        return ()
    return tuple(dict.fromkeys(part for part in LIST_SEPARATOR.split(text) if part))


def _sequence(value: Any, row_number: int) -> int:
    if isinstance(value, bool):
        raise CatalogValidationError(f"第 {row_number} 行的序号不是有效整数")
    try:
        number = int(value)
    except (TypeError, ValueError) as exc:
        raise CatalogValidationError(f"第 {row_number} 行的序号不是有效整数") from exc
    if str(number) != normalize_text(value).removesuffix(".0"):
        raise CatalogValidationError(f"第 {row_number} 行的序号不是有效整数")
    return number


def load_catalog(path: Path) -> CatalogData:
    """Load the ``术语总表`` worksheet without modifying the workbook."""

    workbook_path = Path(path)
    if not workbook_path.is_file():
        raise CatalogValidationError(f"找不到术语总表：{workbook_path}")

    workbook = load_workbook(workbook_path, read_only=True, data_only=True)
    try:
        if "术语总表" not in workbook.sheetnames:
            raise CatalogValidationError("工作簿缺少“术语总表”工作表")
        sheet = workbook["术语总表"]
        header_values = next(sheet.iter_rows(min_row=1, max_row=1, values_only=True), ())
        headers = [normalize_text(value) for value in header_values]
        normalized_headers = {
            normalize_text(header): header for header in REQUIRED_HEADERS
        }
        missing = [
            header
            for normalized, header in normalized_headers.items()
            if normalized not in headers
        ]
        if missing:
            raise CatalogValidationError(f"术语总表缺少必需列：{'、'.join(missing)}")
        indices = {
            header: headers.index(normalized)
            for normalized, header in normalized_headers.items()
        }

        rows: list[CatalogRow] = []
        for row_number, values in enumerate(
            sheet.iter_rows(min_row=2, values_only=True), start=2
        ):
            if not any(normalize_text(value) for value in values):
                continue
            raw = {
                header: values[index] if index < len(values) else None
                for header, index in indices.items()
            }
            for header in REQUIRED_HEADERS:
                if not normalize_text(raw[header]):
                    raise CatalogValidationError(f"第 {row_number} 行的“{header}”不能为空")

            translations = {
                language_code: normalize_text(raw[column])
                for column, language_code in LANGUAGE_COLUMNS.items()
            }
            rows.append(
                CatalogRow(
                    row_number=row_number,
                    sequence=_sequence(raw["序号"], row_number),
                    topic_name=normalize_text(raw["专题（专区）"]),
                    term_name=normalize_name(raw["术语名称"]),
                    term_level=normalize_text(raw["术语层级"]),
                    culture_category=normalize_text(raw["文化分类"]),
                    scenes=split_labels(raw["场景分类"]),
                    tags=split_labels(raw["筛选标签"]),
                    translations=translations,
                    cultural_connotation=normalize_text(raw["文化内涵"]),
                    source_text=normalize_text(raw["来源"]),
                    raw={key: normalize_text(value) for key, value in raw.items()},
                )
            )
    finally:
        workbook.close()

    topic_counts = dict(Counter(row.topic_name for row in rows))
    name_counts = Counter(row.term_name for row in rows)
    duplicates = tuple(sorted(name for name, count in name_counts.items() if count > 1))
    return CatalogData(
        rows=tuple(rows),
        topic_counts=topic_counts,
        canonical_term_count=len(name_counts),
        duplicate_names=duplicates,
    )
