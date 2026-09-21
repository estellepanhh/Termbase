import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TopicEntry } from '../../types/knowledge'

function TopicEntryCard({ entry }: { entry: TopicEntry }) {
  const { i18n } = useTranslation()
  const isChinese = (i18n.resolvedLanguage ?? i18n.language).startsWith('zh')
  const copy = isChinese ? {
    viewTerm: '查看术语档案', viewSource: '查看资料', empty: '该条目的公开资料正在整理中。',
  } : {
    viewTerm: 'View term record', viewSource: 'View source', empty: 'Public material for this entry is being prepared.',
  }
  if (entry.term) {
    return (
      <article className="topic-entry topic-entry--term">
        <div className="topic-entry__meta">
          {entry.term.term_level ? <span>{entry.term.term_level}</span> : null}
          {entry.term.culture_category ? <span>{entry.term.culture_category}</span> : null}
        </div>
        <h3>{entry.term.preferred_name_zh}</h3>
        {entry.term.recommended_translation ? <p className="topic-entry__translation">{entry.term.recommended_translation}</p> : null}
        {entry.term.definition_zh ? <p>{entry.term.definition_zh}</p> : null}
        <Link aria-label={`${copy.viewTerm}${isChinese ? '：' : ': '}${entry.term.preferred_name_zh}`} to={`/terms/${entry.term.id}`}>
          {copy.viewTerm} <span aria-hidden="true">→</span>
        </Link>
      </article>
    )
  }

  return (
    <article className="topic-entry topic-entry--content">
      <h3>{entry.title}</h3>
      {Object.keys(entry.fields).length ? (
        <dl>
          {Object.entries(entry.fields).map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                {typeof value === 'string' && /^https?:\/\//.test(value)
                  ? <a href={value} rel="noreferrer" target="_blank">{copy.viewSource}</a>
                  : String(value)}
              </dd>
            </div>
          ))}
        </dl>
      ) : <p>{copy.empty}</p>}
    </article>
  )
}

export default function TopicEntrySection({
  id,
  title,
  entries,
}: {
  id: string
  title: string
  entries: TopicEntry[]
}) {
  return (
    <section aria-labelledby={`${id}-title`} className="topic-detail__section" id={id}>
      <header>
        <p>{String(entries.length).padStart(2, '0')} ENTRIES</p>
        <h2 id={`${id}-title`}>{title}</h2>
      </header>
      <div className="topic-entry-grid">
        {entries.map((entry) => <TopicEntryCard entry={entry} key={entry.id} />)}
      </div>
    </section>
  )
}
