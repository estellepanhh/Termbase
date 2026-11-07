"""Import the reviewed multilingual master catalog; preview unless --apply is supplied."""

import argparse
from dataclasses import asdict
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.services.master_catalog_import import (
    CatalogData,
    import_master_catalog,
    load_catalog,
)


DEFAULT_WORKBOOK = (
    Path(__file__).parent.parent
    / "data"
    / "术语库总表（741条·2026-11-07已审核）.xlsx"
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--workbook",
        type=Path,
        default=DEFAULT_WORKBOOK,
        help="Path to the reviewed .xlsx workbook",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Commit changes; without this flag the complete import is rolled back",
    )
    return parser


def run_catalog_import(catalog: CatalogData, *, apply: bool):
    try:
        report = import_master_catalog(db.session, catalog)
        if apply:
            db.session.commit()
        else:
            db.session.rollback()
        return report
    except Exception:
        db.session.rollback()
        raise


def print_report(payload: dict) -> None:
    rendered = json.dumps(payload, ensure_ascii=False, indent=2)
    try:
        print(rendered)
    except UnicodeEncodeError:
        sys.stdout.buffer.write((rendered + "\n").encode("utf-8"))


def main() -> None:
    args = build_parser().parse_args()
    catalog = load_catalog(args.workbook)
    app = create_app()
    with app.app_context():
        report = run_catalog_import(catalog, apply=args.apply)
    print_report(
        {
            "mode": "applied" if args.apply else "preview_rolled_back",
            "workbook": str(args.workbook.resolve()),
            **asdict(report),
        }
    )


if __name__ == "__main__":
    main()
