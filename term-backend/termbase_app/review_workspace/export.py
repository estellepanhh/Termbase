from __future__ import annotations

import csv
import io
import json

from flask import Response

from .serializers import serialize_case_detail
from .service import list_cases


def safe_csv_cell(value) -> str:
    text = "" if value is None else str(value)
    return "'" + text if text.startswith(("=", "+", "-", "@")) else text


def _all_cases(filters: dict):
    items = []
    page = 1
    while True:
        result = list_cases(page=page, page_size=100, **filters)
        items.extend(result.items)
        if not result.has_next:
            return items
        page += 1


def export_cases(format_name: str, filters: dict) -> Response:
    cases = _all_cases(filters)
    if format_name == "json":
        body = json.dumps(
            [serialize_case_detail(case) for case in cases],
            ensure_ascii=False,
            indent=2,
        )
        return Response(
            body,
            mimetype="application/json",
            headers={"Content-Disposition": "attachment; filename=review-cases.json"},
        )

    output = io.StringIO(newline="")
    fields = [
        "public_id", "title", "source_text", "status", "terms", "audience",
        "scenario", "style", "locale", "ai_recommended", "final_expression",
        "reviewer_name", "review_notes", "issue_tags", "revision_count",
        "created_at", "updated_at",
    ]
    writer = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()
    for case in cases:
        current = next(
            revision for revision in case.revisions
            if revision.revision_number == case.current_revision_number
        )
        row = {
            "public_id": case.public_id,
            "title": case.title,
            "source_text": case.source_text,
            "status": case.status,
            "terms": "|".join(link.term.preferred_name_zh for link in case.term_links),
            "audience": case.audience,
            "scenario": case.scenario,
            "style": case.style,
            "locale": case.locale,
            "ai_recommended": case.ai_snapshot["report"]["recommended"]["text"],
            "final_expression": current.final_expression,
            "reviewer_name": current.reviewer_name,
            "review_notes": current.review_notes,
            "issue_tags": "|".join(current.issue_tags or []),
            "revision_count": len(case.revisions),
            "created_at": case.created_at.isoformat(),
            "updated_at": case.updated_at.isoformat(),
        }
        writer.writerow({key: safe_csv_cell(value) for key, value in row.items()})
    body = "\ufeff" + output.getvalue()
    return Response(
        body,
        content_type="text/csv;charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=review-cases.csv"},
    )
