from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from ..expression_lab.contracts import (
    Audience,
    EnglishLocale,
    ExpressionStyle,
    Scenario,
    ValidatedExpressionReport,
)


class StringEnum(str, Enum):
    """Python 3.9-compatible string enum."""


class ReviewStatus(StringEnum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    ARCHIVED = "archived"


class IssueTag(StringEnum):
    LITERAL_TRANSLATION = "literal_translation"
    TERMINOLOGY_INCONSISTENCY = "terminology_inconsistency"
    CULTURAL_MISREADING = "cultural_misreading"
    REGISTER_MISMATCH = "register_mismatch"
    AMBIGUITY = "ambiguity"
    UNNATURAL_ENGLISH = "unnatural_english"
    CITATION_GAP = "citation_gap"
    OTHER = "other"


class TransitionAction(StringEnum):
    SUBMIT = "submit"
    APPROVE = "approve"
    RETURN = "return"
    REOPEN = "reopen"
    ARCHIVE = "archive"
    RESTORE = "restore"


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SavedInputSummary(StrictModel):
    source_text: str = Field(min_length=10, max_length=1000)
    target_language: Literal["en"]
    audience: Audience
    scenario: Scenario
    style: ExpressionStyle
    locale: EnglishLocale


class SavedKnowledgeSummary(StrictModel):
    term_count: int = Field(ge=1, le=5)
    translation_count: int = Field(ge=0)
    source_count: int = Field(ge=0)
    context_count: int = Field(ge=0)
    truncated: bool


class SavedExpressionAnalysis(StrictModel):
    request_id: str = Field(min_length=1, max_length=100)
    input_summary: SavedInputSummary
    knowledge_summary: SavedKnowledgeSummary
    report: ValidatedExpressionReport
    generated_at: datetime
    review_status: Literal["ai_unreviewed"]
    warnings: list[str] = Field(default_factory=list, max_length=30)


class CreateReviewCase(StrictModel):
    title: str = Field(min_length=1, max_length=200)
    term_ids: list[int] = Field(min_length=1, max_length=5)
    analysis: SavedExpressionAnalysis

    @field_validator("title", mode="before")
    @classmethod
    def normalize_title(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("term_ids", mode="before")
    @classmethod
    def deduplicate_terms(cls, value):
        return list(dict.fromkeys(value)) if isinstance(value, (list, tuple)) else value

    @field_validator("term_ids")
    @classmethod
    def positive_terms(cls, value):
        if any(term_id <= 0 for term_id in value):
            raise ValueError("term_ids must contain positive ids")
        return value

    @model_validator(mode="after")
    def validate_term_references(self):
        selected = set(self.term_ids)
        if any(item.term_id not in selected for item in self.analysis.report.term_usage):
            raise ValueError("report term usage must reference a selected term")
        return self


class CreateRevision(StrictModel):
    expected_revision_number: int = Field(ge=1)
    final_expression: str = Field(min_length=1, max_length=2000)
    review_notes: str = Field(default="", max_length=5000)
    reviewer_name: str = Field(min_length=1, max_length=100)
    issue_tags: list[IssueTag] = Field(default_factory=list, max_length=8)

    @field_validator("final_expression", "review_notes", "reviewer_name", mode="before")
    @classmethod
    def strip_text(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("issue_tags", mode="before")
    @classmethod
    def deduplicate_tags(cls, value):
        return list(dict.fromkeys(value)) if isinstance(value, (list, tuple)) else value


class TransitionCase(StrictModel):
    action: TransitionAction
    expected_revision_number: int = Field(ge=1)
    reviewer_name: str = Field(min_length=1, max_length=100)
    note: str = Field(default="", max_length=1000)

    @field_validator("reviewer_name", "note", mode="before")
    @classmethod
    def strip_text(cls, value):
        return value.strip() if isinstance(value, str) else value
