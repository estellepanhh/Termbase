from sqlalchemy import distinct, func, select

from ..extensions import db
from ..models import Term, Topic, Translation


def _scalar_count(statement) -> int:
    return int(db.session.execute(statement).scalar_one())


def get_project_overview() -> dict[str, int]:
    return {
        "term_count": _scalar_count(select(func.count(Term.id))),
        "translation_count": _scalar_count(select(func.count(Translation.id))),
        "language_count": _scalar_count(
            select(func.count(distinct(Translation.language_id)))
        ),
        "published_topic_count": _scalar_count(
            select(func.count(Topic.id)).where(Topic.status == "published")
        ),
    }
