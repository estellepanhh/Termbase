import type { ExpressionAnalysis } from './expressionLab'

export type ReviewStatus = 'draft' | 'pending_review' | 'approved' | 'archived'
export type IssueTag = 'literal_translation' | 'terminology_inconsistency' | 'cultural_misreading' | 'register_mismatch' | 'ambiguity' | 'unnatural_english' | 'citation_gap' | 'other'
export type TransitionAction = 'submit' | 'approve' | 'return' | 'reopen' | 'archive' | 'restore'

export interface ReviewTerm { id: number; preferred_name_zh: string }
export interface ReviewRevision {
  revision_number: number
  final_expression: string
  review_notes: string
  reviewer_name: string
  issue_tags: IssueTag[]
  created_at: string
}
export interface ReviewEvent {
  event_type: string
  from_status: ReviewStatus | null
  to_status: ReviewStatus
  reviewer_name: string
  note: string
  created_at: string
}
export interface ReviewCaseSummary {
  public_id: string
  title: string
  source_text: string
  status: ReviewStatus
  current_revision_number: number
  current_revision: ReviewRevision
  terms: ReviewTerm[]
  created_at: string
  updated_at: string
}
export interface ReviewCaseDetail extends ReviewCaseSummary {
  task: { target_language: 'en'; audience: string; scenario: string; style: string; locale: string }
  ai_snapshot: ExpressionAnalysis
  revisions: ReviewRevision[]
  events: ReviewEvent[]
}
export interface WorkspaceStats {
  draft: number
  pending_review: number
  approved: number
  archived: number
  total: number
  average_revision_count: number
}
export interface ReviewCaseQuery {
  page?: number; pageSize?: number; status?: ReviewStatus | ''; termId?: number
  reviewer?: string; issueTag?: IssueTag | ''; q?: string
}
export interface ReviewCasePage {
  data: ReviewCaseSummary[]
  meta: { page: number; page_size: number; total: number; stats: WorkspaceStats }
}
export interface CreateReviewCaseInput { title: string; term_ids: number[]; analysis: ExpressionAnalysis }
export interface CreateReviewCaseResult { case: ReviewCaseSummary; created: boolean }
export interface CreateRevisionInput { expected_revision_number: number; final_expression: string; review_notes: string; reviewer_name: string; issue_tags: IssueTag[] }
export interface TransitionCaseInput { action: TransitionAction; expected_revision_number: number; reviewer_name: string; note: string }
