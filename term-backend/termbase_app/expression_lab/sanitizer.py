from __future__ import annotations

from .contracts import (
    KnowledgePack,
    ModelExpressionReport,
    ReferenceDetail,
    RiskLevel,
    ValidatedExpressionReport,
)


def sanitize_report(
    report: ModelExpressionReport, pack: KnowledgePack
) -> ValidatedExpressionReport:
    """Remove model-created identifiers and enrich valid references server-side."""
    warnings: list[str] = []

    def warn(code: str) -> None:
        if code not in warnings:
            warnings.append(code)

    term_usage = []
    for item in report.term_usage:
        if item.term_id not in pack.allowed_term_ids:
            warn("invalid_term_reference_removed")
            continue
        if (
            item.translation_id is not None
            and item.translation_id not in pack.allowed_translation_ids
        ):
            warn("invalid_translation_reference_removed")
            continue
        if (
            item.translation_id is not None
            and pack.translation_term_ids
            and pack.translation_term_ids.get(item.translation_id) != item.term_id
        ):
            warn("translation_term_mismatch_removed")
            continue
        term_usage.append(item)

    references = []
    seen_source_ids: set[int] = set()
    for item in report.references:
        if item.source_id not in pack.allowed_source_ids:
            warn("invalid_source_reference_removed")
            continue
        if item.source_id in seen_source_ids:
            continue
        details = pack.source_details.get(item.source_id)
        if not details:
            warn("invalid_source_reference_removed")
            continue
        seen_source_ids.add(item.source_id)
        references.append(
            ReferenceDetail(
                source_id=item.source_id,
                title=details.get("title", ""),
                organization=details.get("organization"),
                url=details.get("url"),
                citation=details.get("citation"),
                usage=item.usage,
            )
        )

    alternatives = []
    seen_text = {report.recommended.text.strip().casefold()}
    for item in report.alternatives:
        key = item.text.strip().casefold()
        if key in seen_text:
            continue
        seen_text.add(key)
        alternatives.append(item)

    priority = report.review_priority
    if not references:
        warn("no_valid_references")
        priority = RiskLevel.HIGH

    return ValidatedExpressionReport(
        recommended=report.recommended,
        alternatives=alternatives[:3],
        term_usage=term_usage,
        cultural_risks=report.cultural_risks,
        references=references,
        limitations=report.limitations,
        review_priority=priority,
        warnings=warnings,
    )
