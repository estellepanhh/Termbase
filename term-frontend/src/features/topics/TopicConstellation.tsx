import type { CSSProperties } from 'react'
import KnowledgeGlyph, { type KnowledgeGlyphKind } from '../../components/KnowledgeGlyph'
import type { TopicEntry } from '../../types/knowledge'
import { labelForEntryType, type TopicInterfaceLanguage } from './topicPresentation'

const positions = [
  [50, 10], [76, 22], [88, 51], [75, 78], [51, 88],
  [24, 78], [11, 51], [23, 22], [66, 40], [35, 62],
] as const

const glyphKinds = new Set<KnowledgeGlyphKind>(['term', 'person', 'place', 'culture', 'herb'])

function glyphForEntry(type: string): KnowledgeGlyphKind {
  return glyphKinds.has(type as KnowledgeGlyphKind) ? type as KnowledgeGlyphKind : 'term'
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

export default function TopicConstellation({
  entries,
  topicTitle,
  language,
  childMode,
}: {
  entries: TopicEntry[]
  topicTitle: string
  language: TopicInterfaceLanguage
  childMode: boolean
}) {
  const nodes = featuredEntries(entries)
  const title = language === 'zh' ? `专题知识星图：${topicTitle}` : `Topic constellation: ${topicTitle}`
  const hint = childMode
    ? (language === 'zh' ? '选择一颗知识星，开始儿童探索路线' : 'Choose a knowledge star to begin')
    : (language === 'zh' ? '点击节点，进入下方专题档案' : 'Select a node to open its records below')

  const locate = (entry: TopicEntry) => {
    document.getElementById(`topic-section-${entry.entry_type}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section aria-label={title} className="topic-constellation" data-child-map={childMode || undefined}>
      <header className="topic-constellation__heading">
        <div><span>KNOWLEDGE CONSTELLATION</span><h2>{topicTitle}</h2></div>
        <p>{hint}</p>
      </header>
      <div className="topic-constellation__canvas">
        <div aria-hidden="true" className="topic-constellation__orbit topic-constellation__orbit--outer" />
        <div aria-hidden="true" className="topic-constellation__orbit topic-constellation__orbit--inner" />
        <div className="topic-constellation__hub"><span>{language === 'zh' ? '专题文脉' : 'TOPIC'}</span><strong>{topicTitle}</strong></div>
        {nodes.map((entry, index) => {
          const label = labelForEntryType(entry.entry_type, language)
          const [left, top] = positions[index]
          return <button
            aria-label={`${language === 'zh' ? '定位到' : 'Go to '}${label}${language === 'zh' ? '：' : ': '}${entry.title}`}
            className={`topic-constellation__node topic-constellation__node--${entry.entry_type}`}
            key={entry.id}
            onClick={() => locate(entry)}
            style={{ '--node-left': `${left}%`, '--node-top': `${top}%`, '--node-delay': `${index * -.65}s` } as CSSProperties}
            type="button"
          >
            <span aria-hidden="true"><KnowledgeGlyph kind={glyphForEntry(entry.entry_type)} /></span>
            <strong>{entry.title}</strong>
            <small>{label}</small>
          </button>
        })}
      </div>
      {entries.length > positions.length ? <p className="topic-constellation__more">+ {entries.length - positions.length} {language === 'zh' ? '条资料在下方专题档案中' : 'more records below'}</p> : null}
    </section>
  )
}
