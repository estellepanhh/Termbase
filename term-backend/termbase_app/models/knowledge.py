from ..extensions import db


term_sources = db.Table(
    "kb_term_sources",
    db.Column("term_id", db.ForeignKey("kb_terms.id"), primary_key=True, index=True),
    db.Column("source_id", db.ForeignKey("kb_sources.id"), primary_key=True, index=True),
)


class Term(db.Model):
    __tablename__ = "kb_terms"
    __table_args__ = (
        db.UniqueConstraint("legacy_table", "legacy_id", name="uq_kb_term_legacy"),
    )

    id = db.Column(db.Integer, primary_key=True)
    preferred_name_zh = db.Column(db.String(255), nullable=False, index=True)
    definition_zh = db.Column(db.Text, nullable=False, default="")
    cultural_connotation = db.Column(db.Text, nullable=False, default="")
    term_level = db.Column(db.String(50), nullable=False, default="")
    culture_category = db.Column(db.String(100), nullable=False, default="")
    status = db.Column(db.String(30), nullable=False, default="draft", index=True)
    data_quality = db.Column(db.String(30), nullable=False, default="curated")
    # Lossless source-row archive for fields not yet promoted to the core model.
    legacy_payload = db.Column(db.JSON, nullable=False, default=dict)
    legacy_table = db.Column(db.String(50))
    legacy_id = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.now(),
        onupdate=db.func.now(),
    )

    translations = db.relationship(
        "Translation", back_populates="term", cascade="all, delete-orphan"
    )
    names = db.relationship(
        "TermName", back_populates="term", cascade="all, delete-orphan"
    )
    evidence = db.relationship(
        "TermEvidence", back_populates="term", cascade="all, delete-orphan"
    )
    contexts = db.relationship(
        "TermContext", back_populates="term", cascade="all, delete-orphan"
    )
    cultural_notes = db.relationship(
        "CulturalNote", back_populates="term", cascade="all, delete-orphan"
    )
    outgoing_relations = db.relationship(
        "TermRelation",
        foreign_keys="TermRelation.source_term_id",
        back_populates="source_term",
        cascade="all, delete-orphan",
    )
    incoming_relations = db.relationship(
        "TermRelation",
        foreign_keys="TermRelation.target_term_id",
        back_populates="target_term",
    )
    sources = db.relationship("Source", secondary=term_sources, back_populates="terms")
    topic_items = db.relationship("TopicItem", back_populates="term")


class TermName(db.Model):
    __tablename__ = "kb_term_names"

    id = db.Column(db.Integer, primary_key=True)
    term_id = db.Column(db.Integer, db.ForeignKey("kb_terms.id"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False, default="")
    name_type = db.Column(db.String(30), nullable=False, default="")

    term = db.relationship("Term", back_populates="names")


class Language(db.Model):
    __tablename__ = "kb_languages"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), nullable=False, unique=True)
    name_zh = db.Column(db.String(100), nullable=False, default="")
    name_en = db.Column(db.String(100), nullable=False, default="")
    enabled = db.Column(db.Boolean, nullable=False, default=True)

    translations = db.relationship("Translation", back_populates="language")


class Translation(db.Model):
    __tablename__ = "kb_translations"

    id = db.Column(db.Integer, primary_key=True)
    term_id = db.Column(db.Integer, db.ForeignKey("kb_terms.id"), nullable=False, index=True)
    language_id = db.Column(
        db.Integer, db.ForeignKey("kb_languages.id"), nullable=False, index=True
    )
    text = db.Column(db.Text, nullable=False, default="")
    translation_type = db.Column(db.String(30), nullable=False, default="")
    authority_level = db.Column(db.String(30), nullable=False, default="")
    region = db.Column(db.String(100))
    review_status = db.Column(db.String(30), nullable=False, default="unreviewed")
    note = db.Column(db.Text)

    term = db.relationship("Term", back_populates="translations")
    language = db.relationship("Language", back_populates="translations")
    evidence = db.relationship("TermEvidence", back_populates="translation")
    contexts = db.relationship(
        "TranslationContext", back_populates="translation", cascade="all, delete-orphan"
    )


class Source(db.Model):
    __tablename__ = "kb_sources"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False, default="")
    organization = db.Column(db.String(255))
    published_at = db.Column(db.Date)
    language_code = db.Column(db.String(20))
    source_type = db.Column(db.String(50), nullable=False, default="")
    url = db.Column(db.String(500))
    citation = db.Column(db.Text)
    authority_level = db.Column(db.String(30))
    summary = db.Column(db.Text)
    legacy_value = db.Column(db.String(255))

    terms = db.relationship("Term", secondary=term_sources, back_populates="sources")
    evidence = db.relationship("TermEvidence", back_populates="source")


class TermEvidence(db.Model):
    __tablename__ = "kb_term_evidence"

    id = db.Column(db.Integer, primary_key=True)
    term_id = db.Column(db.Integer, db.ForeignKey("kb_terms.id"), nullable=False, index=True)
    translation_id = db.Column(
        db.Integer, db.ForeignKey("kb_translations.id"), nullable=True, index=True
    )
    source_id = db.Column(db.Integer, db.ForeignKey("kb_sources.id"), nullable=False, index=True)
    original_excerpt = db.Column(db.Text, nullable=False, default="")
    translated_excerpt = db.Column(db.Text, nullable=False, default="")
    locator = db.Column(db.String(255), nullable=False, default="")
    note = db.Column(db.Text)

    term = db.relationship("Term", back_populates="evidence")
    translation = db.relationship("Translation", back_populates="evidence")
    source = db.relationship("Source", back_populates="evidence")


class Context(db.Model):
    __tablename__ = "kb_contexts"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), nullable=False, unique=True)
    name_zh = db.Column(db.String(100), nullable=False, default="")
    audience = db.Column(db.String(100), nullable=False, default="")
    style = db.Column(db.String(100), nullable=False, default="")
    description = db.Column(db.Text, nullable=False, default="")

    term_contexts = db.relationship("TermContext", back_populates="context")
    translation_contexts = db.relationship("TranslationContext", back_populates="context")


class TermContext(db.Model):
    __tablename__ = "kb_term_contexts"

    term_id = db.Column(
        db.Integer, db.ForeignKey("kb_terms.id"), primary_key=True, index=True
    )
    context_id = db.Column(
        db.Integer, db.ForeignKey("kb_contexts.id"), primary_key=True, index=True
    )
    explanation = db.Column(db.Text, nullable=False, default="")
    example = db.Column(db.Text, nullable=False, default="")
    note = db.Column(db.Text)

    term = db.relationship("Term", back_populates="contexts")
    context = db.relationship("Context", back_populates="term_contexts")


class TranslationContext(db.Model):
    __tablename__ = "kb_translation_contexts"

    translation_id = db.Column(
        db.Integer, db.ForeignKey("kb_translations.id"), primary_key=True, index=True
    )
    context_id = db.Column(
        db.Integer, db.ForeignKey("kb_contexts.id"), primary_key=True, index=True
    )
    recommendation_level = db.Column(db.String(30), nullable=False, default="")
    example = db.Column(db.Text, nullable=False, default="")
    note = db.Column(db.Text)

    translation = db.relationship("Translation", back_populates="contexts")
    context = db.relationship("Context", back_populates="translation_contexts")


class CulturalNote(db.Model):
    __tablename__ = "kb_cultural_notes"

    id = db.Column(db.Integer, primary_key=True)
    term_id = db.Column(db.Integer, db.ForeignKey("kb_terms.id"), nullable=False, index=True)
    target_culture = db.Column(db.String(100), nullable=False, default="")
    difference_summary = db.Column(db.Text, nullable=False, default="")
    literal_risk = db.Column(db.Text, nullable=False, default="")
    misconception = db.Column(db.Text, nullable=False, default="")
    recommendation = db.Column(db.Text, nullable=False, default="")

    term = db.relationship("Term", back_populates="cultural_notes")


class TermRelation(db.Model):
    __tablename__ = "kb_term_relations"

    source_term_id = db.Column(
        db.Integer, db.ForeignKey("kb_terms.id"), primary_key=True, index=True
    )
    target_term_id = db.Column(
        db.Integer, db.ForeignKey("kb_terms.id"), primary_key=True, index=True
    )
    relation_type = db.Column(db.String(30), primary_key=True)

    source_term = db.relationship(
        "Term", foreign_keys=[source_term_id], back_populates="outgoing_relations"
    )
    target_term = db.relationship(
        "Term", foreign_keys=[target_term_id], back_populates="incoming_relations"
    )


class Topic(db.Model):
    __tablename__ = "kb_topics"

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(100), nullable=False, unique=True)
    title = db.Column(db.String(255), nullable=False, default="")
    summary = db.Column(db.Text)
    status = db.Column(db.String(30), nullable=False, default="draft")

    items = db.relationship("TopicItem", back_populates="topic", cascade="all, delete-orphan")


class TopicItem(db.Model):
    __tablename__ = "kb_topic_items"

    id = db.Column(db.Integer, primary_key=True)
    topic_id = db.Column(db.Integer, db.ForeignKey("kb_topics.id"), nullable=False, index=True)
    term_id = db.Column(db.Integer, db.ForeignKey("kb_terms.id"), nullable=True, index=True)
    entry_type = db.Column(db.String(30), nullable=False, default="")
    title = db.Column(db.String(255), nullable=False, default="")
    payload = db.Column(db.JSON, nullable=False, default=dict)
    legacy_table = db.Column(db.String(50))
    legacy_id = db.Column(db.String(255))

    topic = db.relationship("Topic", back_populates="items")
    term = db.relationship("Term", back_populates="topic_items")
