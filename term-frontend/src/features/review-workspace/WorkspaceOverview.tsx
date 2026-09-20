import type { WorkspaceStats } from '../../types/reviewWorkspace'

export default function WorkspaceOverview({ stats }: { stats: WorkspaceStats }) {
  const cards = [
    ['草稿案例', stats.draft], ['待审核', stats.pending_review], ['已批准', stats.approved],
    ['全部案例', stats.total], ['平均修订', stats.average_revision_count],
  ]
  return <section className="review-overview" aria-label="工作台概览">
    {cards.map(([label, value]) => <div className="review-metric" key={label}>
      <span>{label}</span><strong>{value}</strong>
    </div>)}
  </section>
}
