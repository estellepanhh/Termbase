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


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Apply explicit language fixes")
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        report = build_translation_cleanup(db.session, apply=args.apply)
        if args.apply:
            db.session.commit()
        print(json.dumps(asdict(report), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
