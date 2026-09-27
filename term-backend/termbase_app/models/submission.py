from ..extensions import db


class TermSubmission(db.Model):
    __tablename__ = "kb_term_submissions"

    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(64), nullable=False, unique=True, index=True)
    created_by_id = db.Column(db.Integer, db.ForeignKey("kb_users.id"), nullable=False, index=True)
    term_id = db.Column(db.Integer, db.ForeignKey("kb_terms.id"), index=True)
    preferred_name_zh = db.Column(db.String(255), nullable=False)
    definition_zh = db.Column(db.Text, nullable=False, default="")
    recommended_translation = db.Column(db.Text, nullable=False, default="")
    cultural_connotation = db.Column(db.Text, nullable=False, default="")
    source_text = db.Column(db.Text, nullable=False, default="")
    status = db.Column(db.String(30), nullable=False, default="pending", index=True)
    review_note = db.Column(db.Text, nullable=False, default="")
    created_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.now(),
        onupdate=db.func.now(),
    )

    created_by = db.relationship("User", backref="term_submissions")
    term = db.relationship("Term")
