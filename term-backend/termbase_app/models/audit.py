from ..extensions import db


class AdminAuditLog(db.Model):
    __tablename__ = "kb_admin_audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    actor_id = db.Column(db.Integer, db.ForeignKey("kb_users.id"), nullable=True, index=True)
    actor_username = db.Column(db.String(80), nullable=False, default="")
    action = db.Column(db.String(80), nullable=False, index=True)
    target_type = db.Column(db.String(80), nullable=False, default="", index=True)
    target_id = db.Column(db.String(80), nullable=False, default="", index=True)
    summary = db.Column(db.String(255), nullable=False, default="")
    payload = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now(), index=True)

    actor = db.relationship("User")
