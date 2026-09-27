import type { CSSProperties } from 'react'
import type { TopicEntry } from '../../types/knowledge'
import { labelForEntryType, type TopicInterfaceLanguage } from './topicPresentation'

const positions = [
  [50, 9], [77, 20], [89, 48], [78, 76], [52, 88],
  [23, 78], [10, 51], [21, 22], [66, 38], [34, 62],
] as const

const typeGlyph: Record<string, string> = {
  term: '言', person: '人', place: '地', culture: '文', herb: '草',
}

function featuredEntries(entries: TopicEntry[]) {
  const featured: TopicEntry[] = []
  const selectedIds = new Set<number>()
  ;['term', 'person', 'place', 'culture', 'herb'].forEach((type) => {
    const entry = entries.find((item) => item.entry_type === type)
    if (entry) { featured.push(entry); selectedIds.add(entry.id) }
  })
  for (const entry of entries) {
    if (featured.length >= positions.length) break
    if (!selectedIds.has(entry.id)) { featured.push(entry); selectedIds.add(entry.id) }
  }
  return featured
}

export default function CulturalKnowledgeMap({
  entries,
  language,
  childMode,
}: {
  entries: TopicEntry[]
  language: TopicInterfaceLanguage
  childMode: boolean
}) {
  const nodes = featuredEntries(entries)
  const title = language === 'zh' ? '淮河文脉图谱' : 'Huaihe cultural knowledge map'
  const hint = childMode
    ? (language === 'zh' ? '儿童探索路线' : 'A young explorer route')
    : (language === 'zh' ? '点击节点，沿着文脉进入专题资料' : 'Select a node to follow the cultural thread')

  const locate = (entry: TopicEntry) => {
    document.getElementById(`topic-section-${entry.entry_type}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section aria-label={title} className="culture-map" data-child-map={childMode || undefined}>
      <header className="culture-map__heading">
        <div><span>KNOWLEDGE CONSTELLATION</span><h2>{title}</h2></div>
        <p>{hint}</p>
      </header>
      <div className="culture-map__canvas">
        <svg aria-hidden="true" className="culture-map__river" preserveAspectRatio="none" viewBox="0 0 1000 520">
          <path d="M-30 305 C130 220 250 365 405 275 S690 185 1030 295" />
          <path d="M-30 330 C160 250 270 390 425 302 S700 215 1030 320" />
        </svg>
        <div className="culture-map__hub"><span>千里淮河</span><strong>文脉共生</strong><small>HUAIHE</small></div>
        {nodes.map((entry, index) => {
          const label = labelForEntryType(entry.entry_type, language)
          const [left, top] = positions[index]
          return (
            <button
              aria-label={`${language === 'zh' ? '定位到' : 'Go to '}${label}${language === 'zh' ? '：' : ': '}${entry.title}`}
              className={`culture-map__node culture-map__node--${entry.entry_type}`}
              key={entry.id}
              onClick={() => locate(entry)}
              style={{ '--node-left': `${left}%`, '--node-top': `${top}%`, '--node-delay': `${index * -0.7}s` } as CSSProperties}
              type="button"
            >
              <span aria-hidden="true">{typeGlyph[entry.entry_type] ?? '录'}</span>
              <strong>{entry.title}</strong>
              <small>{label}</small>
            </button>
          )
        })}
      </div>
      {entries.length > positions.length ? <p className="culture-map__more">+ {entries.length - positions.length} 条资料在下方专题档案中</p> : null}
    </section>
  )
}
