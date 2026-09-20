import type { ReviewCaseDetail, ReviewCaseSummary } from '../../types/reviewWorkspace'

export const summary: ReviewCaseSummary = {
  public_id: 'case-1', title: '和而不同传播案例', source_text: '和而不同强调差异中的和谐。', status: 'draft', current_revision_number: 2,
  current_revision: { revision_number: 2, final_expression: 'Human reviewed expression', review_notes: '调整语域', reviewer_name: 'Reviewer A', issue_tags: ['register_mismatch'], created_at: '2026-09-20T01:00:00Z' },
  terms: [{ id: 7, preferred_name_zh: '和而不同' }], created_at: '2026-09-20T00:00:00Z', updated_at: '2026-09-20T01:00:00Z',
}
export const detail: ReviewCaseDetail = {
  ...summary,
  task: { target_language: 'en', audience: 'overseas_youth', scenario: 'cultural_exhibition', style: 'explanatory', locale: 'general_english' },
  ai_snapshot: {
    request_id: 'req-1', input_summary: { source_text: summary.source_text, target_language: 'en', audience: 'overseas_youth', scenario: 'cultural_exhibition', style: 'explanatory', locale: 'general_english' },
    knowledge_summary: { term_count: 1, translation_count: 1, source_count: 0, context_count: 0, truncated: false },
    report: { recommended: { text: 'Harmony in diversity', rationale: 'Preserves difference', strategy: ['explanatory'] }, alternatives: [{ text: 'Harmony without uniformity', best_for: 'Academic', tradeoff: 'Literal' }], term_usage: [], cultural_risks: [], references: [], limitations: ['Needs review'], review_priority: 'medium' },
    generated_at: '2026-09-20T00:00:00Z', review_status: 'ai_unreviewed', warnings: [],
  },
  revisions: [{ revision_number: 1, final_expression: 'Harmony in diversity', review_notes: '', reviewer_name: '', issue_tags: [], created_at: '2026-09-20T00:00:00Z' }, summary.current_revision],
  events: [{ event_type: 'created', from_status: null, to_status: 'draft', reviewer_name: '', note: '', created_at: '2026-09-20T00:00:00Z' }],
}
