import { useState } from 'react'
import type { ReviewRevision } from '../../types/reviewWorkspace'
import { issueLabels } from './reviewWorkspaceLabels'

export default function RevisionHistory({ revisions }: { revisions: ReviewRevision[] }) {
  const [selected, setSelected] = useState(revisions.at(-1)?.revision_number)
  const revision = revisions.find((item) => item.revision_number === selected)
  return <section className="revision-history">
    <h3>修订历史</h3><div className="revision-history__tabs">{revisions.map((item) =>
      <button className={item.revision_number === selected ? 'is-active' : ''} key={item.revision_number} onClick={() => setSelected(item.revision_number)}>版本 {item.revision_number}</button>)}</div>
    {revision && <div className="revision-history__body"><p>{revision.final_expression}</p><small>{revision.reviewer_name || '未署名'} · {revision.review_notes || '无评审意见'}</small>
      {!!revision.issue_tags.length && <div className="tag-row">{revision.issue_tags.map((tag) => <span key={tag}>{issueLabels[tag]}</span>)}</div>}</div>}
  </section>
}
