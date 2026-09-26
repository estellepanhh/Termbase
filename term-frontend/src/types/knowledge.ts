export interface TranslationSummary {
  language_code: string
  language_name_zh: string
  text: string
  translation_type: string
  authority_level: string
  review_status: string
}

export interface TermSummary {
  id: number
  preferred_name_zh: string
  definition_zh: string
  child_explanation?: string | null
  term_level: string
  culture_category: string
  data_quality: string
  recommended_translation: TranslationSummary | null
  language_count: number
  source_count: number
}

export interface TermQuery {
  q?: string
  level?: string
  culture?: string
  language?: string
  page?: number
  pageSize?: number
}

export interface PageMeta {
  page: number
  page_size: number
  total: number
}

export interface ProjectOverview {
  term_count: number
  translation_count: number
  language_count: number
  published_topic_count: number
}

export interface PaginatedTerms {
  data: TermSummary[]
  meta: PageMeta
}

export interface TermNameDetail {
  name: string
  name_type: string
}

export interface TranslationContextDetail {
  context_code: string
  context_name_zh: string
  audience: string
  style: string
  description: string
  recommendation_level: string
  example: string
  note: string | null
}

export interface TermContextDetail {
  context_code: string
  context_name_zh: string
  audience: string
  style: string
  description: string
  explanation: string
  example: string
  note: string | null
}

export interface TranslationDetail extends TranslationSummary {
  region: string | null
  note: string | null
  contexts: TranslationContextDetail[]
}

export interface EvidenceDetail {
  id: number
  translation_id: number | null
  original_excerpt: string
  translated_excerpt: string
  locator: string
  note: string | null
}

export interface SourceDetail {
  id: number
  title: string
  organization: string | null
  published_at: string | null
  language_code: string | null
  source_type: string
  url: string | null
  citation: string | null
  authority_level: string | null
  summary: string | null
  legacy_value: string | null
  evidence: EvidenceDetail[]
}

export interface CulturalNoteDetail {
  target_culture: string
  difference_summary: string
  literal_risk: string
  misconception: string
  recommendation: string
}

export interface TermRelationDetail {
  direction: string
  relation_type: string
  source_term_id: number
  source_term_name_zh: string
  target_term_id: number
  target_term_name_zh: string
}

export interface TopicDetail {
  slug: string
  title: string
  summary: string | null
  entry_type: string
  item_title: string
}

export interface TopicSummary {
  slug: string
  title: string
  summary: string | null
  item_count: number
  term_count: number
  entry_type_counts: Record<string, number>
}

export interface TopicTermData {
  id: number
  preferred_name_zh: string
  definition_zh: string | null
  term_level: string | null
  culture_category: string | null
  recommended_translation: string | null
}

export interface TopicTermEntry {
  id: number
  entry_type: 'term'
  title: string
  term: TopicTermData
  fields: Record<string, never>
}

export interface TopicContentEntry {
  id: number
  entry_type: string
  title: string
  term: null
  fields: Record<string, string | number | boolean>
}

export type TopicEntry = TopicTermEntry | TopicContentEntry

export interface PublicTopicDetail extends TopicSummary {
  items: TopicEntry[]
}

export interface TermProfile extends TermSummary {
  cultural_connotation: string
  names: TermNameDetail[]
  translations: TranslationDetail[]
  sources: SourceDetail[]
  contexts: TermContextDetail[]
  cultural_notes: CulturalNoteDetail[]
  relations: TermRelationDetail[]
  topics: TopicDetail[]
}
