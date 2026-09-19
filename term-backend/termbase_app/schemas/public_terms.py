from typing import NotRequired, TypedDict


class TranslationSummary(TypedDict):
    language_code: str
    language_name_zh: str
    text: str
    translation_type: str
    authority_level: str
    review_status: str


class TermSummary(TypedDict):
    id: int
    preferred_name_zh: str
    definition_zh: str
    term_level: str
    culture_category: str
    data_quality: str
    recommended_translation: TranslationSummary | None
    language_count: int
    source_count: int


class NameDetail(TypedDict):
    name: str
    name_type: str


class ContextDetail(TypedDict):
    context_code: str
    context_name_zh: str
    audience: str
    style: str
    description: str
    explanation: NotRequired[str]
    example: str
    note: str | None
    recommendation_level: NotRequired[str]


class TranslationDetail(TranslationSummary):
    region: str | None
    note: str | None
    contexts: list[ContextDetail]


class EvidenceDetail(TypedDict):
    id: int
    translation_id: int | None
    original_excerpt: str
    translated_excerpt: str
    locator: str
    note: str | None


class SourceDetail(TypedDict):
    id: int
    title: str
    organization: str | None
    published_at: str | None
    language_code: str | None
    source_type: str
    url: str | None
    citation: str | None
    authority_level: str | None
    summary: str | None
    legacy_value: str | None
    evidence: list[EvidenceDetail]


class CulturalNoteDetail(TypedDict):
    target_culture: str
    difference_summary: str
    literal_risk: str
    misconception: str
    recommendation: str


class RelationDetail(TypedDict):
    direction: str
    relation_type: str
    source_term_id: int
    source_term_name_zh: str
    target_term_id: int
    target_term_name_zh: str


class TopicDetail(TypedDict):
    slug: str
    title: str
    summary: str | None
    entry_type: str
    item_title: str
    payload: dict


class TermDetail(TermSummary):
    cultural_connotation: str
    names: list[NameDetail]
    translations: list[TranslationDetail]
    sources: list[SourceDetail]
    contexts: list[ContextDetail]
    cultural_notes: list[CulturalNoteDetail]
    relations: list[RelationDetail]
    topics: list[TopicDetail]
