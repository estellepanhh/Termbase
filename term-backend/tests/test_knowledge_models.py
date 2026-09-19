import unittest
import importlib.util
from pathlib import Path

import sqlalchemy as sa
from alembic.autogenerate import produce_migrations
from alembic.operations import Operations
from alembic.operations import ops
from alembic.runtime.migration import MigrationContext
from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.migration_filters import include_managed_object
from termbase_app.models import (
    Context,
    CulturalNote,
    Language,
    Source,
    Term,
    TermContext,
    TermEvidence,
    TermName,
    TermRelation,
    Topic,
    TopicItem,
    Translation,
    TranslationContext,
)


class KnowledgeModelTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:",
        })
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()

    def tearDown(self):
        db.drop_all()
        self.context.pop()

    def test_term_keeps_multiple_translations_and_sources(self):
        term = Term(
            preferred_name_zh="和而不同",
            definition_zh="承认差异并追求和谐共处",
            term_level="本源层",
            culture_category="中华优秀传统文化",
            status="published",
            data_quality="legacy_unreviewed",
        )
        language = Language(code="en", name_zh="英语", name_en="English")
        second_language = Language(code="fr", name_zh="法语", name_en="French")
        source = Source(title="中华思想文化术语", source_type="book")
        second_source = Source(title="中国哲学关键词", source_type="book")
        translation = Translation(
            term=term,
            language=language,
            text="harmony in diversity",
            translation_type="recommended",
            review_status="unreviewed",
        )
        second_translation = Translation(
            term=term,
            language=second_language,
            text="harmonie dans la diversite",
            translation_type="recommended",
            review_status="unreviewed",
        )
        term.sources.extend([source, second_source])
        db.session.add_all(
            [term, language, second_language, translation, second_translation]
        )
        db.session.commit()

        saved = db.session.get(Term, term.id)
        self.assertEqual(
            {item.text for item in saved.translations},
            {"harmony in diversity", "harmonie dans la diversite"},
        )
        self.assertEqual(
            {item.title for item in saved.sources},
            {"中华思想文化术语", "中国哲学关键词"},
        )
        self.assertEqual(
            [item.preferred_name_zh for item in db.session.get(Source, source.id).terms],
            ["和而不同"],
        )
        self.assertEqual(
            [
                item.preferred_name_zh
                for item in db.session.get(Source, second_source.id).terms
            ],
            ["和而不同"],
        )

    def test_source_exposes_reverse_terms(self):
        term = Term(preferred_name_zh="和而不同")
        source = Source(title="中华思想文化术语", source_type="book")
        term.sources.append(source)
        db.session.add(term)
        db.session.commit()

        saved_source = db.session.get(Source, source.id)
        self.assertEqual([item.preferred_name_zh for item in saved_source.terms], ["和而不同"])

    def test_deleting_term_removes_owned_children_and_keeps_references(self):
        term = Term(preferred_name_zh="和而不同")
        target = Term(preferred_name_zh="求同存异")
        language = Language(code="en", name_zh="英语", name_en="English")
        source = Source(title="中华思想文化术语", source_type="book")
        context = Context(code="children", name_zh="儿童")
        translation = Translation(term=term, language=language, text="harmony")
        name = TermName(term=term, name="和", name_type="short")
        evidence = TermEvidence(term=term, source=source, original_excerpt="和而不同")
        term_context = TermContext(term=term, context=context, explanation="尊重不同")
        note = CulturalNote(term=term, target_culture="English", literal_risk="literal")
        relation = TermRelation(source_term=term, target_term=target, relation_type="related")
        db.session.add_all(
            [
                term,
                target,
                language,
                source,
                context,
                translation,
                name,
                evidence,
                term_context,
                note,
                relation,
            ]
        )
        db.session.commit()

        identifiers = (translation.id, name.id, evidence.id, note.id)
        db.session.delete(term)
        db.session.commit()

        self.assertIsNone(db.session.get(Translation, identifiers[0]))
        self.assertIsNone(db.session.get(TermName, identifiers[1]))
        self.assertIsNone(db.session.get(TermEvidence, identifiers[2]))
        self.assertIsNone(db.session.get(CulturalNote, identifiers[3]))
        self.assertIsNone(db.session.get(TermContext, (term.id, context.id)))
        self.assertIsNone(
            db.session.get(TermRelation, (term.id, target.id, "related"))
        )
        self.assertIsNotNone(db.session.get(Language, language.id))
        self.assertIsNotNone(db.session.get(Source, source.id))
        self.assertIsNotNone(db.session.get(Context, context.id))
        self.assertIsNotNone(db.session.get(Term, target.id))

    def test_deleting_translation_removes_context_and_detaches_optional_evidence(self):
        term = Term(preferred_name_zh="和而不同")
        language = Language(code="en", name_zh="英语", name_en="English")
        source = Source(title="中华思想文化术语", source_type="book")
        context = Context(code="academic", name_zh="学术")
        translation = Translation(term=term, language=language, text="harmony")
        translation_context = TranslationContext(
            translation=translation,
            context=context,
            recommendation_level="recommended",
        )
        evidence = TermEvidence(
            term=term,
            translation=translation,
            source=source,
            original_excerpt="和而不同",
        )
        db.session.add_all([term, language, source, context, translation_context, evidence])
        db.session.commit()

        context_key = (translation.id, context.id)
        evidence_id = evidence.id
        db.session.delete(translation)
        db.session.commit()

        self.assertIsNone(db.session.get(TranslationContext, context_key))
        saved_evidence = db.session.get(TermEvidence, evidence_id)
        self.assertIsNotNone(saved_evidence)
        self.assertIsNone(saved_evidence.translation_id)

    def test_composite_context_associations_retain_their_content(self):
        term = Term(preferred_name_zh="和而不同")
        language = Language(code="en", name_zh="英语", name_en="English")
        context = Context(code="children", name_zh="儿童")
        translation = Translation(term=term, language=language, text="harmony")
        term_context = TermContext(term=term, context=context, explanation="尊重不同")
        translation_context = TranslationContext(
            translation=translation,
            context=context,
            example="We can disagree respectfully.",
        )
        db.session.add_all([term, language, context, term_context, translation_context])
        db.session.commit()

        self.assertEqual(
            db.session.get(TermContext, (term.id, context.id)).explanation,
            "尊重不同",
        )
        self.assertEqual(
            db.session.get(TranslationContext, (translation.id, context.id)).example,
            "We can disagree respectfully.",
        )

    def test_deleting_topic_removes_owned_items_but_keeps_term(self):
        term = Term(preferred_name_zh="和而不同")
        topic = Topic(slug="harmony", title="和谐")
        item = TopicItem(topic=topic, term=term, entry_type="term", title="和而不同")
        db.session.add_all([term, topic, item])
        db.session.commit()

        item_id = item.id
        db.session.delete(topic)
        db.session.commit()

        self.assertIsNone(db.session.get(TopicItem, item_id))
        self.assertIsNotNone(db.session.get(Term, term.id))

    def test_term_relation_is_navigable_from_both_directions(self):
        source_term = Term(preferred_name_zh="和而不同")
        target_term = Term(preferred_name_zh="求同存异")
        relation = TermRelation(
            source_term=source_term,
            target_term=target_term,
            relation_type="related",
        )
        db.session.add_all([source_term, target_term, relation])
        db.session.commit()

        saved_source = db.session.get(Term, source_term.id)
        saved_target = db.session.get(Term, target_term.id)
        self.assertEqual(saved_source.outgoing_relations[0].target_term_id, target_term.id)
        self.assertEqual(saved_target.incoming_relations[0].source_term_id, source_term.id)

    def test_autogeneration_filter_only_manages_kb_schema_objects(self):
        legacy_metadata = sa.MetaData()
        sa.Table("terms", legacy_metadata, sa.Column("id", sa.Integer, primary_key=True))
        managed_metadata = sa.MetaData()
        sa.Table("kb_terms", managed_metadata, sa.Column("id", sa.Integer, primary_key=True))
        engine = sa.create_engine("sqlite+pysqlite:///:memory:")

        with engine.connect() as connection:
            legacy_metadata.create_all(connection)
            context = MigrationContext.configure(
                connection,
                opts={
                    "target_metadata": managed_metadata,
                    "include_object": include_managed_object,
                },
            )
            migration = produce_migrations(context, managed_metadata)

        operations = migration.upgrade_ops.ops
        self.assertTrue(
            any(
                isinstance(operation, ops.CreateTableOp)
                and operation.table_name == "kb_terms"
                for operation in operations
            )
        )
        self.assertFalse(
            any(
                isinstance(operation, ops.DropTableOp) and operation.table_name == "terms"
                for operation in operations
            )
        )

    def test_initial_migration_creates_and_removes_only_kb_tables(self):
        migration_path = (
            Path(__file__).resolve().parents[1]
            / "migrations"
            / "versions"
            / "3d256e5c3d75_add_knowledge_core_tables.py"
        )
        spec = importlib.util.spec_from_file_location("knowledge_migration", migration_path)
        migration = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(migration)
        engine = sa.create_engine("sqlite+pysqlite:///:memory:")

        with engine.connect() as connection:
            context = MigrationContext.configure(connection)
            with Operations.context(context):
                migration.upgrade()
            self.assertEqual(len(sa.inspect(connection).get_table_names()), 14)
            self.assertTrue(
                all(name.startswith("kb_") for name in sa.inspect(connection).get_table_names())
            )
            columns = {column["name"]: column for column in sa.inspect(connection).get_columns("kb_terms")}
            self.assertIn("legacy_payload", columns)
            topic_item_columns = {column["name"]: column for column in sa.inspect(connection).get_columns("kb_topic_items")}
            self.assertEqual(topic_item_columns["legacy_id"]["type"].length, 255)

            context = MigrationContext.configure(connection)
            with Operations.context(context):
                migration.downgrade()
            self.assertEqual(sa.inspect(connection).get_table_names(), [])
