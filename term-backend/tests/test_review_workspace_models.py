import importlib.util
import io
from pathlib import Path

import sqlalchemy as sa
from alembic.operations import Operations
from alembic.runtime.migration import MigrationContext

from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.models import (
    ReviewCase,
    ReviewCaseTerm,
    ReviewEvent,
    ReviewRevision,
    Term,
)


def load_review_migration():
    migration_path = (
        Path(__file__).resolve().parents[1]
        / "migrations" / "versions" / "9f4c2a7b1d30_add_review_workspace.py"
    )
    spec = importlib.util.spec_from_file_location("review_migration", migration_path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    return migration


def make_app():
    return create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:",
        "RATELIMIT_ENABLED": False,
    })


def test_review_models_keep_ordered_append_only_history():
    app = make_app()
    with app.app_context():
        db.create_all()
        first = Term(preferred_name_zh="和而不同", status="published")
        second = Term(preferred_name_zh="天下大同", status="published")
        case = ReviewCase(
            public_id="case-1",
            source_request_id="req-1",
            title="研究案例",
            source_text="一段足够长度的中文原文。",
            target_language="en",
            audience="overseas_youth",
            scenario="cultural_exhibition",
            style="explanatory",
            locale="general_english",
            ai_snapshot={"request_id": "req-1"},
        )
        case.term_links.extend([
            ReviewCaseTerm(term=second, position=1),
            ReviewCaseTerm(term=first, position=2),
        ])
        case.revisions.extend([
            ReviewRevision(revision_number=1, final_expression="AI draft"),
            ReviewRevision(
                revision_number=2,
                final_expression="Human revision",
                reviewer_name="Reviewer A",
                issue_tags=["register_mismatch"],
            ),
        ])
        case.events.append(ReviewEvent(
            event_type="created", from_status=None, to_status="draft"
        ))
        db.session.add(case)
        db.session.commit()

        saved = db.session.get(ReviewCase, case.id)
        assert [link.term.preferred_name_zh for link in saved.term_links] == ["天下大同", "和而不同"]
        assert [revision.revision_number for revision in saved.revisions] == [1, 2]
        assert saved.current_revision_number == 1
        assert first.review_case_links[0].case_id == saved.id


def test_review_case_unique_keys_are_enforced():
    app = make_app()
    with app.app_context():
        db.create_all()
        kwargs = dict(
            source_request_id="same-request",
            title="Case",
            source_text="一段足够长度的中文原文。",
            target_language="en",
            audience="academic",
            scenario="academic_paper",
            style="formal",
            locale="general_english",
            ai_snapshot={},
        )
        db.session.add(ReviewCase(public_id="one", **kwargs))
        db.session.commit()
        db.session.add(ReviewCase(public_id="two", **kwargs))
        try:
            db.session.commit()
            assert False, "duplicate source_request_id must fail"
        except sa.exc.IntegrityError:
            db.session.rollback()


def test_review_workspace_migration_preserves_knowledge_tables():
    migration = load_review_migration()
    engine = sa.create_engine("sqlite+pysqlite:///:memory:")
    metadata = sa.MetaData()
    sa.Table("kb_terms", metadata, sa.Column("id", sa.Integer, primary_key=True))

    with engine.connect() as connection:
        metadata.create_all(connection)
        connection.execute(sa.text("INSERT INTO kb_terms (id) VALUES (7)"))
        connection.commit()
        context = MigrationContext.configure(connection)
        with Operations.context(context):
            migration.upgrade()
        names = set(sa.inspect(connection).get_table_names())
        assert {"review_cases", "review_revisions", "review_case_terms", "review_events"} <= names
        assert connection.execute(sa.text("SELECT COUNT(*) FROM kb_terms")).scalar_one() == 1

        context = MigrationContext.configure(connection)
        with Operations.context(context):
            migration.downgrade()
        assert sa.inspect(connection).get_table_names() == ["kb_terms"]


def test_review_workspace_migration_is_valid_for_mysql_text_columns():
    migration = load_review_migration()
    output = io.StringIO()
    context = MigrationContext.configure(
        dialect_name="mysql",
        opts={"as_sql": True, "output_buffer": output},
    )
    with Operations.context(context):
        migration.upgrade()
    sql = output.getvalue().lower()
    assert "review_notes text not null default" not in sql
    assert "note text not null default" not in sql
