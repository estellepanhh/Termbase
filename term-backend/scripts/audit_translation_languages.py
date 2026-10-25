"""Audit legacy translation languages; writes only when --apply is supplied."""

import argparse
from dataclasses import asdict
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.services.translation_cleanup import build_translation_cleanup


class CleanupArgumentParser(argparse.ArgumentParser):
    def parse_args(self, args=None, namespace=None):
        parsed = super().parse_args(args, namespace)
        if parsed.apply and parsed.report is None:
            self.error("--apply requires --report so rollback data is written before commit")
        return parsed


def build_parser() -> argparse.ArgumentParser:
    parser = CleanupArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Apply explicit language fixes")
    parser.add_argument("--report", type=Path, help="Write the complete old/new audit record to a new JSON file")
    return parser


def print_report(rendered: str) -> None:
    try:
        print(rendered)
    except UnicodeEncodeError:
        sys.stdout.buffer.write((rendered + "\n").encode("utf-8"))


def main() -> None:
    args = build_parser().parse_args()

    app = create_app()
    with app.app_context():
        report = build_translation_cleanup(db.session, apply=args.apply)
        rendered = json.dumps(asdict(report), ensure_ascii=False, indent=2)
        if args.report is not None:
            with args.report.open("x", encoding="utf-8") as report_file:
                report_file.write(rendered + "\n")
        if args.apply:
            db.session.commit()
        print_report(rendered)


if __name__ == "__main__":
    main()
