import type { ReviewCaseSummary } from '../../types/reviewWorkspace'
import { statusLabels } from './reviewWorkspaceLabels'

export default function CaseQueue({ cases, selectedId, loading, onSelect }: { cases: ReviewCaseSummary[]; selectedId?: string; loading: boolean; onSelect: (id: string) => void }) {
  return <section className="case-queue" aria-label="案例队列">
    <div className="case-queue__heading"><h2>评审队列</h2>{loading && <span>更新中…</span>}</div>
    {!cases.length && !loading ? <div className="review-empty">暂无符合条件的案例</div> : cases.map((item) =>
      <button aria-label={`打开案例 ${item.title}`} className={`case-card ${selectedId === item.public_id ? 'is-active' : ''}`} key={item.public_id} onClick={() => onSelect(item.public_id)}>
        <span className={`status-pill status-pill--${item.status}`}>{statusLabels[item.status]}</span>
        <strong>{item.title}</strong><span className="case-card__source">{item.source_text}</span>
        <span className="case-card__meta">第 {item.current_revision_number} 版 · {item.current_revision.reviewer_name || '待认领'}</span>
      </button>)}
  </section>
}
