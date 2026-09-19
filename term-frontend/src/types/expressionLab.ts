export type Audience = 'academic' | 'international_media' | 'overseas_youth' | 'general_public'
export type Scenario = 'academic_paper' | 'policy_text' | 'news_media' | 'cultural_exhibition' | 'social_media'
export type ExpressionStyle = 'formal' | 'explanatory' | 'concise' | 'accessible'
export type EnglishLocale = 'general_english' | 'british_english' | 'american_english'
export type ReviewPriority = 'low' | 'medium' | 'high'

export interface ExpressionTaskInput {
  term_ids: number[]
  source_text: string
  target_language: 'en'
  audience: Audience
  scenario: Scenario
  style: ExpressionStyle
  locale: EnglishLocale
}
export type ExpressionInputSummary = Omit<ExpressionTaskInput, 'term_ids'>

export interface RecommendedExpression { text: string; rationale: string; strategy: string[] }
export interface AlternativeExpression { text: string; best_for: string; tradeoff: string }
export interface TermUsage { term_id: number; translation_id: number | null; adopted_translation: string; explanation: string }
export interface CulturalRisk { level: ReviewPriority; issue: string; recommendation: string }
export interface ReferenceDetail { source_id: number; title: string; organization: string | null; url: string | null; citation: string | null; usage: string }
export interface ExpressionReport {
  recommended: RecommendedExpression
  alternatives: AlternativeExpression[]
  term_usage: TermUsage[]
  cultural_risks: CulturalRisk[]
  references: ReferenceDetail[]
  limitations: string[]
  review_priority: ReviewPriority
}
export interface KnowledgeSummary { term_count: number; translation_count: number; source_count: number; context_count: number; truncated: boolean }
export interface ExpressionAnalysis {
  request_id: string
  input_summary: ExpressionInputSummary
  knowledge_summary: KnowledgeSummary
  report: ExpressionReport
  generated_at: string
  review_status: 'ai_unreviewed'
  warnings: string[]
}

export interface ExpressionAnalysisResponse {
  code: number
  message: string
  data: ExpressionAnalysis
}
