import type { IssueTag, ReviewCaseQuery, ReviewStatus } from '../../types/reviewWorkspace'
import { issueLabels, statusLabels } from './reviewWorkspaceLabels'

export default function CaseFilters({ query, onChange }: { query: ReviewCaseQuery; onChange: (patch: ReviewCaseQuery) => void }) {
  return <section className="review-filters" aria-label="案例筛选">
    <label>案例状态<select value={query.status || ''} onChange={(event) => onChange({ status: event.target.value as ReviewStatus | '', page: 1 })}>
      <option value="">全部状态</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>
    <label>问题标签<select value={query.issueTag || ''} onChange={(event) => onChange({ issueTag: event.target.value as IssueTag | '', page: 1 })}>
      <option value="">全部标签</option>{Object.entries(issueLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>
    <label>评审人<input value={query.reviewer || ''} onChange={(event) => onChange({ reviewer: event.target.value, page: 1 })} placeholder="姓名" /></label>
    <label className="review-filters__search">关键词<input value={query.q || ''} onChange={(event) => onChange({ q: event.target.value, page: 1 })} placeholder="标题、原文或定稿" /></label>
  </section>
}
