from __future__ import annotations

from typing import Any

from ..extensions import db
from ..models import AdminAuditLog, User


def record_admin_action(
    actor: User,
    action: str,
    target_type: str,
    target_id: str | int,
    summary: str,
    payload: dict[str, Any] | None = None,
) -> AdminAuditLog:
    log = AdminAuditLog(
        actor_id=actor.id,
        actor_username=actor.username,
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        summary=summary[:255],
        payload=payload or {},
    )
    db.session.add(log)
    return log
