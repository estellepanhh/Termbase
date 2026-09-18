"""Run the idempotent legacy-to-knowledge-core migration."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.services.legacy_import import import_legacy_knowledge


app = create_app()
with app.app_context():
    report = import_legacy_knowledge(db.session)
    print(report)
