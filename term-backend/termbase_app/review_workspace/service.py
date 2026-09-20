from __future__ import annotations

from sqlalchemy import and_, func, or_, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from ..extensions import db
from ..models import (
    ReviewCase,
    ReviewCaseTerm,
    ReviewEvent,
    ReviewRevision,
    Term,
)
from .contracts import (
    CreateReviewCase,
    CreateRevision,
    ReviewStatus,
    TransitionAction,
    TransitionCase,
)


class ReviewWorkspaceError(Exception):
    status_code = 500
    public_message = "研究工作台暂时不可用"


class CaseNotFound(ReviewWorkspaceError):
    status_code = 404
    public_message = "案例不存在"


class ReviewTermNotFound(ReviewWorkspaceError):
    status_code = 404
    public_message = "部分术语不存在或尚未发布"

    def __init__(self, missing_ids):
        super().__init__(self.public_message)
        self.missing_ids = list(missing_ids)


class RevisionConflict(ReviewWorkspaceError):
    status_code = 409
    public_message = "案例已有新版本，请刷新后再编辑"


class InvalidTransition(ReviewWorkspaceError):
    status_code = 409
    public_message = "当前状态不允许此操作"


class ArchivedCase(ReviewWorkspaceError):
    status_code = 409
    public_message = "归档案例需恢复后才能编辑"


TRANSITIONS = {
    (ReviewStatus.DRAFT, TransitionAction.SUBMIT): ReviewStatus.PENDING_REVIEW,
    (ReviewStatus.PENDING_REVIEW, TransitionAction.APPROVE): ReviewStatus.APPROVED,
    (ReviewStatus.PENDING_REVIEW, TransitionAction.RETURN): ReviewStatus.DRAFT,
    (ReviewStatus.APPROVED, TransitionAction.REOPEN): ReviewStatus.DRAFT,
    (ReviewStatus.APPROVED, TransitionAction.ARCHIVE): ReviewStatus.ARCHIVED,
    (ReviewStatus.ARCHIVED, TransitionAction.RESTORE): ReviewStatus.APPROVED,
}

EVENT_TYPES = {
    TransitionAction.SUBMIT: "submitted",
    TransitionAction.APPROVE: "approved",
    TransitionAction.RETURN: "returned",
    TransitionAction.REOPEN: "returned",
    TransitionAction.ARCHIVE: "archived",
    TransitionAction.RESTORE: "restored",
}


def _case_options():
    return (
        selectinload(ReviewCase.term_links).selectinload(ReviewCaseTerm.term),
        selectinload(ReviewCase.revisions),
        selectinload(ReviewCase.events),
    )


def get_case(public_id: str) -> ReviewCase:
    stmt = db.select(ReviewCase).where(ReviewCase.public_id == public_id).options(*_case_options())
    case = db.session.scalar(stmt)
    if case is None:
        raise CaseNotFound(CaseNotFound.public_message)
    return case


def create_case(command: CreateReviewCase) -> tuple[ReviewCase, bool]:
    existing = db.session.scalar(
        db.select(ReviewCase).where(
            ReviewCase.source_request_id == command.analysis.request_id
        )
    )
    if existing is not None:
        return get_case(existing.public_id), False

    terms = db.session.scalars(
        db.select(Term).where(
            Term.id.in_(command.term_ids), Term.status == "published"
        )
    ).all()
    terms_by_id = {term.id: term for term in terms}
    missing = [term_id for term_id in command.term_ids if term_id not in terms_by_id]
    if missing:
        raise ReviewTermNotFound(missing)

    summary = command.analysis.input_summary
    case = ReviewCase(
        source_request_id=command.analysis.request_id,
        title=command.title,
        source_text=summary.source_text,
        target_language=summary.target_language,
        audience=summary.audience.value,
        scenario=summary.scenario.value,
        style=summary.style.value,
        locale=summary.locale.value,
        ai_snapshot=command.analysis.model_dump(mode="json"),
        status=ReviewStatus.DRAFT.value,
        current_revision_number=1,
    )
    case.term_links = [
        ReviewCaseTerm(term=terms_by_id[term_id], position=position)
        for position, term_id in enumerate(command.term_ids, start=1)
    ]
    case.revisions.append(ReviewRevision(
        revision_number=1,
        final_expression=command.analysis.report.recommended.text,
        review_notes="",
        reviewer_name="",
        issue_tags=[],
    ))
    case.events.append(ReviewEvent(
        event_type="created",
        from_status=None,
        to_status=ReviewStatus.DRAFT.value,
        reviewer_name="",
        note="",
    ))
    db.session.add(case)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        existing = db.session.scalar(
            db.select(ReviewCase).where(
                ReviewCase.source_request_id == command.analysis.request_id
            )
        )
        if existing is None:
            raise
        return get_case(existing.public_id), False
    return get_case(case.public_id), True


def add_revision(public_id: str, command: CreateRevision) -> ReviewRevision:
    case = get_case(public_id)
    if case.status == ReviewStatus.ARCHIVED.value:
        raise ArchivedCase(ArchivedCase.public_message)
    if case.current_revision_number != command.expected_revision_number:
        raise RevisionConflict(RevisionConflict.public_message)

    next_number = command.expected_revision_number + 1
    result = db.session.execute(
        update(ReviewCase)
        .where(
            ReviewCase.id == case.id,
            ReviewCase.current_revision_number == command.expected_revision_number,
            ReviewCase.status != ReviewStatus.ARCHIVED.value,
        )
        .values(current_revision_number=next_number, updated_at=func.now())
    )
    if result.rowcount != 1:
        db.session.rollback()
        raise RevisionConflict(RevisionConflict.public_message)
    saved = ReviewRevision(
        case_id=case.id,
        revision_number=next_number,
        final_expression=command.final_expression,
        review_notes=command.review_notes,
        reviewer_name=command.reviewer_name,
        issue_tags=[tag.value for tag in command.issue_tags],
    )
    db.session.add(saved)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise RevisionConflict(RevisionConflict.public_message) from None
    return saved


def transition_case(public_id: str, command: TransitionCase) -> ReviewCase:
    case = get_case(public_id)
    if case.current_revision_number != command.expected_revision_number:
        raise RevisionConflict(RevisionConflict.public_message)
    current = ReviewStatus(case.status)
    target = TRANSITIONS.get((current, command.action))
    if target is None:
        raise InvalidTransition(InvalidTransition.public_message)
    if command.action in {TransitionAction.RETURN, TransitionAction.REOPEN} and not command.note:
        raise InvalidTransition("退回或重启案例必须填写说明")
    latest = case.revisions[-1]
    if command.action is TransitionAction.SUBMIT and (
        not latest.final_expression.strip() or not latest.reviewer_name.strip()
    ):
        raise InvalidTransition("提交审核前必须先保存人工定稿和审核人")

    result = db.session.execute(
        update(ReviewCase)
        .where(
            ReviewCase.id == case.id,
            ReviewCase.status == current.value,
            ReviewCase.current_revision_number == command.expected_revision_number,
        )
        .values(status=target.value, updated_at=func.now())
    )
    if result.rowcount != 1:
        db.session.rollback()
        raise RevisionConflict(RevisionConflict.public_message)
    db.session.add(ReviewEvent(
        case_id=case.id,
        event_type=EVENT_TYPES[command.action],
        from_status=current.value,
        to_status=target.value,
        reviewer_name=command.reviewer_name,
        note=command.note,
    ))
    db.session.commit()
    return get_case(public_id)


def list_cases(
    *, page: int = 1, page_size: int = 20, status: str = "",
    term_id: int | None = None, reviewer: str = "", issue_tag: str = "", q: str = "",
):
    page = max(1, page)
    page_size = min(100, max(1, page_size))
    stmt = db.select(ReviewCase).options(*_case_options())
    if status:
        stmt = stmt.where(ReviewCase.status == status)
    if term_id is not None:
        stmt = stmt.join(ReviewCaseTerm).where(ReviewCaseTerm.term_id == term_id)
    if reviewer or issue_tag:
        stmt = stmt.join(
            ReviewRevision,
            and_(
                ReviewRevision.case_id == ReviewCase.id,
                ReviewRevision.revision_number == ReviewCase.current_revision_number,
            ),
        )
        if reviewer:
            stmt = stmt.where(ReviewRevision.reviewer_name.ilike(f"%{reviewer.strip()}%"))
        if issue_tag:
            stmt = stmt.where(ReviewRevision.issue_tags.contains(issue_tag))
    if q.strip():
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(or_(ReviewCase.title.ilike(pattern), ReviewCase.source_text.ilike(pattern)))
    stmt = stmt.distinct().order_by(ReviewCase.updated_at.desc(), ReviewCase.id.desc())
    return db.paginate(stmt, page=page, per_page=page_size, error_out=False)


def workspace_stats() -> dict:
    cases = db.session.scalars(db.select(ReviewCase).options(selectinload(ReviewCase.revisions))).all()
    counts = {status.value: 0 for status in ReviewStatus}
    for case in cases:
        counts[case.status] += 1
    counts["total"] = len(cases)
    counts["average_revision_count"] = (
        round(sum(len(case.revisions) for case in cases) / len(cases), 2)
        if cases else 0
    )
    return counts
