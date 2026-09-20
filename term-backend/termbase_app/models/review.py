from __future__ import annotations

from uuid import uuid4

from ..extensions import db


class ReviewCase(db.Model):
    __tablename__ = "review_cases"

    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(
        db.String(32), nullable=False, unique=True, index=True,
        default=lambda: uuid4().hex,
    )
    source_request_id = db.Column(db.String(100), nullable=False, unique=True, index=True)
    title = db.Column(db.String(200), nullable=False)
    source_text = db.Column(db.Text, nullable=False)
    target_language = db.Column(db.String(20), nullable=False, default="en")
    audience = db.Column(db.String(50), nullable=False)
    scenario = db.Column(db.String(50), nullable=False)
    style = db.Column(db.String(50), nullable=False)
    locale = db.Column(db.String(50), nullable=False)
    ai_snapshot = db.Column(db.JSON, nullable=False)
    status = db.Column(db.String(30), nullable=False, default="draft", index=True)
    current_revision_number = db.Column(db.Integer, nullable=False, default=1)
    created_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, server_default=db.func.now(), onupdate=db.func.now()
    )

    term_links = db.relationship(
        "ReviewCaseTerm",
        back_populates="case",
        cascade="all, delete-orphan",
        order_by="ReviewCaseTerm.position",
    )
    revisions = db.relationship(
        "ReviewRevision",
        back_populates="case",
        cascade="all, delete-orphan",
        order_by="ReviewRevision.revision_number",
    )
    events = db.relationship(
        "ReviewEvent",
        back_populates="case",
        cascade="all, delete-orphan",
        order_by="ReviewEvent.id",
    )


class ReviewCaseTerm(db.Model):
    __tablename__ = "review_case_terms"

    case_id = db.Column(
        db.Integer, db.ForeignKey("review_cases.id", ondelete="CASCADE"),
        primary_key=True, index=True,
    )
    term_id = db.Column(
        db.Integer, db.ForeignKey("kb_terms.id"), primary_key=True, index=True,
    )
    position = db.Column(db.Integer, nullable=False)

    case = db.relationship("ReviewCase", back_populates="term_links")
    term = db.relationship("Term", back_populates="review_case_links")


class ReviewRevision(db.Model):
    __tablename__ = "review_revisions"
    __table_args__ = (
        db.UniqueConstraint("case_id", "revision_number", name="uq_review_revision_number"),
    )

    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(
        db.Integer, db.ForeignKey("review_cases.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    revision_number = db.Column(db.Integer, nullable=False)
    final_expression = db.Column(db.Text, nullable=False)
    review_notes = db.Column(db.Text, nullable=False, default="")
    reviewer_name = db.Column(db.String(100), nullable=False, default="")
    issue_tags = db.Column(db.JSON, nullable=False, default=list)
    created_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now())

    case = db.relationship("ReviewCase", back_populates="revisions")


class ReviewEvent(db.Model):
    __tablename__ = "review_events"

    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(
        db.Integer, db.ForeignKey("review_cases.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    event_type = db.Column(db.String(30), nullable=False)
    from_status = db.Column(db.String(30))
    to_status = db.Column(db.String(30), nullable=False)
    reviewer_name = db.Column(db.String(100), nullable=False, default="")
    note = db.Column(db.Text, nullable=False, default="")
    created_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now())

    case = db.relationship("ReviewCase", back_populates="events")
