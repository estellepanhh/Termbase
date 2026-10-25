import type { CSSProperties } from 'react'
import type { TopicEntry } from '../../types/knowledge'
import { labelForEntryType, type TopicInterfaceLanguage } from './topicPresentation'
import KnowledgeGlyph, { type KnowledgeGlyphKind } from '../../components/KnowledgeGlyph'

const positions = [
  [50, 9], [77, 20], [89, 48], [78, 76], [52, 88],
  [23, 78], [10, 51], [21, 22], [66, 38], [34, 62],
] as const

const placeLabels = [
  { name: '寿县', left: 16, top: 63 },
  { name: '淮南', left: 37, top: 50 },
  { name: '蚌埠', left: 64, top: 43 },
  { name: '凤阳', left: 84, top: 56 },
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
        <svg aria-label={language === 'zh' ? '淮河流域文化路线' : 'Huaihe cultural route'} className="culture-map__river" preserveAspectRatio="none" role="img" viewBox="0 0 1000 520">
          <defs>
            <linearGradient id="huaihe-water" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#b8dcda" />
              <stop offset=".45" stopColor="#82c5c7" />
              <stop offset="1" stopColor="#aed8cf" />
            </linearGradient>
            <filter id="huaihe-depth" x="-10%" y="-40%" width="120%" height="180%">
              <feDropShadow dx="0" dy="12" floodColor="#4b8e91" floodOpacity=".18" stdDeviation="16" />
            </filter>
          </defs>
          <path className="culture-map__riverbed" d="M-45 320 C130 218 250 382 418 286 S710 205 1045 315" />
          <path className="culture-map__water" d="M-45 320 C130 218 250 382 418 286 S710 205 1045 315" />
          <path className="culture-map__current" d="M-45 306 C135 235 255 355 420 272 S710 224 1045 301" />
        </svg>
        <div aria-label={language === 'zh' ? '淮河沿岸地点' : 'Places along the Huaihe'} className="culture-map__places">
          {placeLabels.map((place) => (
            <span key={place.name} style={{ '--place-left': `${place.left}%`, '--place-top': `${place.top}%` } as CSSProperties}>
              <i aria-hidden="true" />{place.name}
            </span>
          ))}
        </div>
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
              <span aria-hidden="true"><KnowledgeGlyph kind={glyphForEntry(entry.entry_type)} /></span>
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
