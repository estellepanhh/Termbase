import type { IssueTag, ReviewStatus } from '../../types/reviewWorkspace'

export const statusLabels: Record<ReviewStatus, string> = {
  draft: '草稿', pending_review: '待审核', approved: '已批准', archived: '已归档',
}

export const issueLabels: Record<IssueTag, string> = {
  literal_translation: '直译痕迹', terminology_inconsistency: '术语不一致',
  cultural_misreading: '文化误读', register_mismatch: '语域不符', ambiguity: '表达歧义',
  unnatural_english: '英文不自然', citation_gap: '引证不足', other: '其他',
}
