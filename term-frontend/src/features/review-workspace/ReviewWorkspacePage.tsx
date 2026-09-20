import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getReviewCase, listReviewCases } from '../../services/reviewWorkspaceApi'
import type { IssueTag, ReviewCaseDetail, ReviewCaseQuery, ReviewCaseSummary, ReviewStatus, WorkspaceStats } from '../../types/reviewWorkspace'
import CaseFilters from './CaseFilters'
import CaseQueue from './CaseQueue'
import CaseReviewPanel from './CaseReviewPanel'
import WorkspaceOverview from './WorkspaceOverview'
import WorkspaceExportActions from './WorkspaceExportActions'
import './review-workspace.css'

const emptyStats: WorkspaceStats = { draft: 0, pending_review: 0, approved: 0, archived: 0, total: 0, average_revision_count: 0 }

export default function ReviewWorkspacePage() {
  const location = useLocation(); const navigate = useNavigate()
  const params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const query: ReviewCaseQuery = useMemo(() => ({ page: Number(params.get('page')) || 1, pageSize: 20, status: (params.get('status') || '') as ReviewStatus | '', reviewer: params.get('reviewer') || '', issueTag: (params.get('issueTag') || '') as IssueTag | '', q: params.get('q') || '' }), [params])
  const selectedId = params.get('case') || undefined
  const [cases, setCases] = useState<ReviewCaseSummary[]>([]); const [stats, setStats] = useState(emptyStats)
  const [detail, setDetail] = useState<ReviewCaseDetail>(); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const listSequence = useRef(0); const detailSequence = useRef(0)

  useEffect(() => {
    const sequence = ++listSequence.current
    listReviewCases(query).then((result) => { if (sequence === listSequence.current) { setCases(result.data); setStats(result.meta.stats) } }).catch(() => { if (sequence === listSequence.current) setError('案例队列加载失败，请稍后重试') }).finally(() => { if (sequence === listSequence.current) setLoading(false) })
  }, [query])
  useEffect(() => {
    if (!selectedId) return
    const sequence = ++detailSequence.current
    getReviewCase(selectedId).then((value) => { if (sequence === detailSequence.current) setDetail(value) }).catch(() => { if (sequence === detailSequence.current) setError('案例详情加载失败') })
  }, [selectedId])

  function updateUrl(patch: ReviewCaseQuery & { case?: string }) {
    setLoading(true); setError('')
    const next = new URLSearchParams(location.search)
    Object.entries(patch).forEach(([key, value]) => { if (value === '' || value === undefined) next.delete(key); else next.set(key, String(value)) })
    navigate({ pathname: location.pathname, search: next.toString() }, { replace: true })
  }
  async function refresh(changed?: ReviewCaseDetail) {
    if (changed) setDetail(changed)
    else if (selectedId) setDetail(await getReviewCase(selectedId))
    const result = await listReviewCases(query); setCases(result.data); setStats(result.meta.stats)
  }

  return <div className="review-workspace">
    <header className="review-workspace__hero"><div><span className="review-eyebrow">HUMAN REVIEW / CASE REPOSITORY</span><h1>人工评审与案例工作台</h1><p>将 AI 初稿转化为可追溯、可复核、可沉淀的人工评审案例。</p></div><div className="hero-seal">审<span>REVIEW</span></div></header>
    <WorkspaceOverview stats={stats} /><CaseFilters query={query} onChange={updateUrl} /><WorkspaceExportActions query={query} />
    {error && <div className="review-error" role="alert">{error}</div>}
    <div className="review-workspace__content"><CaseQueue cases={cases} loading={loading} onSelect={(caseId) => updateUrl({ case: caseId })} selectedId={selectedId} />
      <main className="review-detail">{detail && detail.public_id === selectedId ? <CaseReviewPanel detail={detail} key={`${detail.public_id}:${detail.current_revision_number}`} onChanged={(changed) => void refresh(changed)} /> : <div className="review-detail__empty"><span>⌁</span><h2>选择一个案例开始评审</h2><p>AI 结果、人工定稿、问题标注和版本历史将在这里并列呈现。</p></div>}</main>
    </div>
  </div>
}
