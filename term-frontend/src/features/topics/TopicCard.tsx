import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TopicSummary } from '../../types/knowledge'
import { labelForEntryType } from './topicPresentation'

export default function TopicCard({ topic, index }: { topic: TopicSummary; index: number }) {
  const { i18n } = useTranslation()
  const language = (i18n.resolvedLanguage ?? i18n.language).startsWith('zh') ? 'zh' : 'en'
  const copy = language === 'zh' ? {
    index: '专题', missingSummary: '该专题的研究导语正在整理中。', scale: '专题规模',
    items: `${topic.item_count} 条内容`, records: '术语档案', terms: `${topic.term_count} 个核心术语`,
    types: '专题内容类型', open: `进入${topic.title}专题`,
  } : {
    index: 'Topic', missingSummary: 'The research introduction for this topic is being prepared.', scale: 'Topic scale',
    items: `${topic.item_count} ${topic.item_count === 1 ? 'record' : 'records'}`, records: 'Term records', terms: `${topic.term_count} core ${topic.term_count === 1 ? 'term' : 'terms'}`,
    types: 'Topic content types', open: `Open ${topic.title} topic`,
  }
  return (
    <article className="topic-card topic-atlas-entry">
      <span aria-hidden="true" className="topic-atlas-entry__number">{String(index + 1).padStart(2, '0')}</span>
      <div className="topic-card__index" aria-hidden="true">{copy.index} / {topic.slug}</div>
      <h2>{topic.title}</h2>
      <p className="topic-card__summary">{topic.summary || copy.missingSummary}</p>
      <dl className="topic-card__metrics">
        <div><dt>{copy.scale}</dt><dd>{copy.items}</dd></div>
        <div><dt>{copy.records}</dt><dd>{copy.terms}</dd></div>
      </dl>
      <ul className="topic-card__types" aria-label={copy.types}>
        {Object.entries(topic.entry_type_counts).map(([type, count]) => (
          <li key={type}>{labelForEntryType(type, language)} <span>{count}</span></li>
        ))}
      </ul>
      <Link className="topic-card__link" to={`/topics/${topic.slug}`}>
        {copy.open} <span aria-hidden="true">→</span>
      </Link>
    </article>
  )
}
