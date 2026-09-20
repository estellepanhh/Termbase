import { useEffect, useState } from 'react'
import { createReviewRevision } from '../../services/reviewWorkspaceApi'
import type { IssueTag, ReviewCaseDetail } from '../../types/reviewWorkspace'
import { issueLabels, statusLabels } from './reviewWorkspaceLabels'
import RevisionHistory from './RevisionHistory'
import StateActions from './StateActions'

export default function CaseReviewPanel({ detail, onChanged }: { detail: ReviewCaseDetail; onChanged: (detail?: ReviewCaseDetail) => void }) {
  const current = detail.current_revision
  const [finalExpression, setFinalExpression] = useState(current.final_expression)
  const [notes, setNotes] = useState(current.review_notes)
  const [reviewer, setReviewer] = useState(current.reviewer_name)
  const [tags, setTags] = useState<IssueTag[]>(current.issue_tags)
  const [saving, setSaving] = useState(false); const [error, setError] = useState('')
  useEffect(() => { setFinalExpression(current.final_expression); setNotes(current.review_notes); setReviewer(current.reviewer_name); setTags(current.issue_tags); setError('') }, [detail.public_id, detail.current_revision_number])
  const locked = detail.status === 'archived'
  function toggleTag(tag: IssueTag) { setTags((value) => value.includes(tag) ? value.filter((item) => item !== tag) : [...value, tag]) }
  async function save() {
    setSaving(true); setError('')
    try { await createReviewRevision(detail.public_id, { expected_revision_number: detail.current_revision_number, final_expression: finalExpression, review_notes: notes, reviewer_name: reviewer, issue_tags: tags }); onChanged() }
    catch (reason) { setError((reason as { response?: { status?: number } }).response?.status === 409 ? '案例已有新版本，请刷新后再编辑' : '保存失败，请检查内容后重试') }
    finally { setSaving(false) }
  }
  return <article className="review-panel">
    <header className="review-panel__header"><div><span className="review-eyebrow">CASE / {detail.public_id}</span><h2>{detail.title}</h2></div><span className={`status-pill status-pill--${detail.status}`}>{statusLabels[detail.status]}</span></header>
    <div className="review-context"><p><strong>原文</strong>{detail.source_text}</p><div>{detail.terms.map((term) => <span key={term.id}>{term.preferred_name_zh}</span>)}</div></div>
    <section className="expression-compare" aria-label="表达对照"><div><small>AI 建议 · 不可修改</small><p>{detail.ai_snapshot.report.recommended.text}</p><span>{detail.ai_snapshot.report.recommended.rationale}</span></div><div><small>当前人工定稿 · 第 {detail.current_revision_number} 版</small><p>{current.final_expression}</p><span>{current.reviewer_name || '尚未署名'}</span></div></section>
    <section className="revision-editor"><h3>新增人工修订</h3>
      <label>人工定稿<textarea disabled={locked} value={finalExpression} onChange={(event) => setFinalExpression(event.target.value)} /></label>
      <div className="revision-editor__row"><label>评审人<input disabled={locked} value={reviewer} onChange={(event) => setReviewer(event.target.value)} /></label><label>评审意见<textarea disabled={locked} value={notes} onChange={(event) => setNotes(event.target.value)} /></label></div>
      <fieldset disabled={locked}><legend>问题标签</legend><div className="issue-grid">{(Object.entries(issueLabels) as Array<[IssueTag, string]>).map(([tag, label]) => <label key={tag}><input checked={tags.includes(tag)} onChange={() => toggleTag(tag)} type="checkbox" />{label}</label>)}</div></fieldset>
      {error && <div className="review-error" role="alert">{error}</div>}
      <div className="revision-editor__actions"><button className="primary-action" disabled={locked || saving || !finalExpression.trim() || !reviewer.trim()} onClick={() => void save()}>{saving ? '保存中…' : '保存新修订'}</button><StateActions detail={detail} reviewer={reviewer} onChanged={onChanged} /></div>
    </section>
    <RevisionHistory revisions={detail.revisions} />
  </article>
}
