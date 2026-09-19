export interface TranslationSummary {
  language_code: string
  language_name_zh: string
  text: string
  translation_type: 'recommended' | 'acceptable' | 'historical' | 'discouraged'
  authority_level: string
  review_status: string
}

export interface TermSummary {
  id: number
  preferred_name_zh: string
  definition_zh: string
  term_level: string
  culture_category: string
  data_quality: 'curated' | 'legacy_unreviewed'
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

export interface PaginatedTerms {
  data: TermSummary[]
  meta: PageMeta
}

export interface TermProfile extends TermSummary {
  cultural_connotation: string
  names: Array<{ name: string; name_type: string }>
  translations: TranslationSummary[]
  sources: Array<{ id: number; title: string; organization: string; citation: string; url: string }>
  contexts: Array<{ code: string; name_zh: string; audience: string; style: string; explanation: string; example: string }>
  cultural_notes: Array<{ target_culture: string; difference_summary: string; literal_risk: string; recommendation: string }>
  relations: Array<{ id: number; name: string; relation_type: string }>
  topics: Array<{ slug: string; title: string }>
}
