"""Import the curated Huaihe people and herb workbook; preview by default."""

import argparse
from dataclasses import asdict
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.services.huaihe_materials_import import (
    import_huaihe_materials,
    load_huaihe_materials,
)


DEFAULT_WORKBOOK = (
    Path(__file__).parent.parent
    / "data"
    / "淮河文化人物与本草（网站专题条目·41条备.xlsx"
)


def build_parser():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook", type=Path, default=DEFAULT_WORKBOOK)
    parser.add_argument("--apply", action="store_true", help="Commit changes; preview rolls back")
    return parser


def run_materials_import(materials, *, apply):
    try:
        report = import_huaihe_materials(db.session, materials)
        db.session.commit() if apply else db.session.rollback()
        return report
    except Exception:
        db.session.rollback()
        raise


def main():
    args = build_parser().parse_args()
    materials = load_huaihe_materials(args.workbook)
    app = create_app()
    with app.app_context():
        report = run_materials_import(materials, apply=args.apply)
    print(json.dumps({
        "mode": "applied" if args.apply else "preview_rolled_back",
        "workbook": str(args.workbook.resolve()),
        **asdict(report),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
