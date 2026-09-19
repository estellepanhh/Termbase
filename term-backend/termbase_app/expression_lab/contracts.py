from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StringEnum(str, Enum):
    """Python 3.9-compatible string enum."""


class Audience(StringEnum):
    ACADEMIC = "academic"
    INTERNATIONAL_MEDIA = "international_media"
    OVERSEAS_YOUTH = "overseas_youth"
    GENERAL_PUBLIC = "general_public"


class Scenario(StringEnum):
    ACADEMIC_PAPER = "academic_paper"
    POLICY_TEXT = "policy_text"
    NEWS_MEDIA = "news_media"
    CULTURAL_EXHIBITION = "cultural_exhibition"
    SOCIAL_MEDIA = "social_media"


class ExpressionStyle(StringEnum):
    FORMAL = "formal"
    EXPLANATORY = "explanatory"
    CONCISE = "concise"
    ACCESSIBLE = "accessible"


class EnglishLocale(StringEnum):
    GENERAL = "general_english"
    BRITISH = "british_english"
    AMERICAN = "american_english"


class RiskLevel(StringEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ExpressionTask(BaseModel):
    model_config = ConfigDict(extra="forbid")

    term_ids: list[int] = Field(min_length=1, max_length=5)
    source_text: str = Field(min_length=10, max_length=1000)
    target_language: str = Field(pattern=r"^en$")
    audience: Audience
    scenario: Scenario
    style: ExpressionStyle
    locale: EnglishLocale

    @field_validator("term_ids", mode="before")
    @classmethod
    def deduplicate_term_ids(cls, value):
        if not isinstance(value, (list, tuple)):
            return value
        return list(dict.fromkeys(value))

    @field_validator("term_ids")
    @classmethod
    def validate_term_ids(cls, value):
        if any(item <= 0 for item in value):
            raise ValueError("term_ids must contain positive ids")
        return value

    @field_validator("source_text")
    @classmethod
    def normalize_source_text(cls, value):
        value = value.strip()
        if not 10 <= len(value) <= 1000:
            raise ValueError("source_text must contain 10-1000 characters")
        return value


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class RecommendedExpression(StrictModel):
    text: str = Field(min_length=1, max_length=2000)
    rationale: str = Field(min_length=1, max_length=3000)
    strategy: list[str] = Field(min_length=1, max_length=6)


class AlternativeExpression(StrictModel):
    text: str = Field(min_length=1, max_length=2000)
    best_for: str = Field(min_length=1, max_length=1000)
    tradeoff: str = Field(min_length=1, max_length=1500)


class TermUsage(StrictModel):
    term_id: int = Field(gt=0)
    translation_id: int | None = Field(default=None, gt=0)
    adopted_translation: str = Field(min_length=1, max_length=2000)
    explanation: str = Field(min_length=1, max_length=2000)


class CulturalRisk(StrictModel):
    level: RiskLevel
    issue: str = Field(min_length=1, max_length=2000)
    recommendation: str = Field(min_length=1, max_length=2000)


class ModelReference(StrictModel):
    source_id: int = Field(gt=0)
    usage: str = Field(min_length=1, max_length=1500)


class ModelExpressionReport(StrictModel):
    recommended: RecommendedExpression
    alternatives: list[AlternativeExpression] = Field(min_length=1, max_length=3)
    term_usage: list[TermUsage] = Field(default_factory=list, max_length=5)
    cultural_risks: list[CulturalRisk] = Field(default_factory=list, max_length=8)
    references: list[ModelReference] = Field(default_factory=list, max_length=12)
    limitations: list[str] = Field(min_length=1, max_length=8)
    review_priority: RiskLevel


class ReferenceDetail(StrictModel):
    source_id: int = Field(gt=0)
    title: str
    organization: str | None = None
    url: str | None = None
    citation: str | None = None
    usage: str


class ValidatedExpressionReport(StrictModel):
    recommended: RecommendedExpression
    alternatives: list[AlternativeExpression]
    term_usage: list[TermUsage]
    cultural_risks: list[CulturalRisk]
    references: list[ReferenceDetail]
    limitations: list[str]
    review_priority: RiskLevel
    warnings: list[str] = Field(default_factory=list)


class ExpressionLabError(Exception):
    status_code = 500
    public_message = "表达分析暂时不可用"


class KnowledgeTermNotFound(ExpressionLabError):
    status_code = 404
    public_message = "部分术语不存在或尚未发布"

    def __init__(self, missing_ids: list[int] | None = None):
        super().__init__(self.public_message)
        self.missing_ids = missing_ids or []


class ProviderUnavailable(ExpressionLabError):
    status_code = 503
    public_message = "AI服务暂时不可用，请稍后重试"


class ProviderBadResponse(ExpressionLabError):
    status_code = 502
    public_message = "AI服务返回了不可用结果，请稍后重试"


class InvalidModelOutput(ExpressionLabError):
    status_code = 422
    public_message = "生成结果结构异常，请重试"
