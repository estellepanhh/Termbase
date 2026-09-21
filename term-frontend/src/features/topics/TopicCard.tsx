import { Link } from 'react-router-dom'
import type { TopicSummary } from '../../types/knowledge'

const entryTypeLabels: Record<string, string> = {
  term: '核心术语',
  person: '文化人物',
  place: '文化地点',
  culture: '文化条目',
  herb: '淮河本草',
}

export function labelForEntryType(entryType: string) {
  return entryTypeLabels[entryType] ?? '专题资料'
}

export default function TopicCard({ topic }: { topic: TopicSummary }) {
  return (
    <article className="topic-card">
      <div className="topic-card__index" aria-hidden="true">专题 / {topic.slug}</div>
      <h2>{topic.title}</h2>
      <p className="topic-card__summary">{topic.summary || '该专题的研究导语正在整理中。'}</p>
      <dl className="topic-card__metrics">
        <div><dt>专题规模</dt><dd>{topic.item_count} 条内容</dd></div>
        <div><dt>术语档案</dt><dd>{topic.term_count} 个核心术语</dd></div>
      </dl>
      <ul className="topic-card__types" aria-label="专题内容类型">
        {Object.entries(topic.entry_type_counts).map(([type, count]) => (
          <li key={type}>{labelForEntryType(type)} <span>{count}</span></li>
        ))}
      </ul>
      <Link className="topic-card__link" to={`/topics/${topic.slug}`}>
        进入{topic.title}专题 <span aria-hidden="true">→</span>
      </Link>
    </article>
  )
}
