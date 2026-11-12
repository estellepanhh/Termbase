from sqlalchemy import distinct, func, select

from ..extensions import db
from ..models import Language, Term, Topic, Translation


ACTIVE_LANGUAGE_CODES = ("en", "fr", "ru", "es", "ar", "ja")


def _scalar_count(statement) -> int:
    return int(db.session.execute(statement).scalar_one())


def get_project_overview() -> dict[str, int]:
    return {
        "term_count": _scalar_count(select(func.count(Term.id))),
        "translation_count": _scalar_count(select(func.count(Translation.id))),
        "language_count": _scalar_count(
            select(func.count(distinct(Language.code)))
            .select_from(Translation)
            .join(Language, Translation.language_id == Language.id)
            .where(Language.code.in_(ACTIVE_LANGUAGE_CODES))
        ),
        "published_topic_count": _scalar_count(
            select(func.count(Topic.id)).where(Topic.status == "published")
        ),
    }
