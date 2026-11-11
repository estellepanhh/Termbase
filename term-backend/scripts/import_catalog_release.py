"""Atomically import the current master catalog and Huaihe materials release."""

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
from termbase_app.services.master_catalog_import import import_master_catalog, load_catalog


DATA_DIR = Path(__file__).parent.parent / "data"
DEFAULT_CATALOG = DATA_DIR / "术语库总表（835条·2026-11-11）.xlsx"
DEFAULT_MATERIALS = DATA_DIR / "淮河文化人物与本草（网站专题条目·41条备.xlsx"


def build_parser():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--materials", type=Path, default=DEFAULT_MATERIALS)
    parser.add_argument("--apply", action="store_true", help="Commit both imports; preview rolls both back")
    return parser


def run_release_import(catalog, materials, *, apply):
    try:
        catalog_report = import_master_catalog(db.session, catalog)
        materials_report = import_huaihe_materials(db.session, materials)
        db.session.commit() if apply else db.session.rollback()
        return catalog_report, materials_report
    except Exception:
        db.session.rollback()
        raise


def main():
    args = build_parser().parse_args()
    catalog = load_catalog(args.catalog)
    materials = load_huaihe_materials(args.materials)
    app = create_app()
    with app.app_context():
        catalog_report, materials_report = run_release_import(
            catalog, materials, apply=args.apply
        )
    print(json.dumps({
        "mode": "applied" if args.apply else "preview_rolled_back",
        "catalog_workbook": str(args.catalog.resolve()),
        "materials_workbook": str(args.materials.resolve()),
        "catalog": asdict(catalog_report),
        "huaihe_materials": asdict(materials_report),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
