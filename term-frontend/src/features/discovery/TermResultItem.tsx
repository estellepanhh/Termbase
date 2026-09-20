import { Link } from 'react-router-dom'
import type { TermSummary } from '../../types/knowledge'
import { useChildMode } from '../../context/ChildModeContext'

type TermResultItemProps = {
  term: TermSummary
}

export default function TermResultItem({ term }: TermResultItemProps) {
  const { isChildMode } = useChildMode()
  const definition = isChildMode && term.child_explanation ? term.child_explanation : term.definition_zh
  return (
    <article className="term-result-item">
      <div className="term-result-item__meta">
        <span>{term.term_level}</span>
        <span>{term.culture_category}</span>
        {term.data_quality === 'legacy_unreviewed' ? <span className="term-result-item__notice">历史数据待复核</span> : null}
      </div>
      <h2><Link to={`/terms/${term.id}`}>{term.preferred_name_zh}</Link></h2>
      {isChildMode && term.child_explanation ? <span className="child-mode-label">给小朋友的话</span> : null}
      <p className="term-result-item__definition">{definition}</p>
      {term.recommended_translation ? (
        <p className="term-result-item__translation">
          <span>推荐译法</span>
          {term.recommended_translation.text}
        </p>
      ) : null}
      <div className="term-result-item__facts">
        <span>{term.language_count} 种语言</span>
        <span>{term.source_count} 个来源</span>
      </div>
    </article>
  )
}
