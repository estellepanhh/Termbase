import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PageIntro from '../../components/editorial/PageIntro'
import { useChildMode } from '../../context/ChildModeContext'
import { getTopic } from '../../services/knowledgeApi'
import type { PublicTopicDetail, TopicEntry } from '../../types/knowledge'
import { entrySearchText, labelForEntryType } from './topicPresentation'
import CulturalKnowledgeMap from './CulturalKnowledgeMap'
import TopicEntrySection from './TopicEntrySection'
import './topics.css'

const entryTypeOrder = ['term', 'person', 'place', 'culture', 'herb']

const detailLabels = {
  zh: {
    loading: '正在展开专题资料…', notFoundEyebrow: 'TOPIC NOT FOUND', notFound: '专题不存在或尚未发布',
    notFoundDescription: '该专题可能仍在整理，或者访问地址已经变化。', back: '返回文化专题',
    errorEyebrow: 'CONNECTION INTERRUPTED', error: '专题暂时无法加载', errorDescription: '请检查网络连接后重新尝试。', retry: '重新加载专题',
    missingSummary: '该专题的研究导语正在整理中。', overview: '专题数据概览', items: '条专题内容', terms: '个核心术语', types: '类研究材料',
    empty: '该专题目前没有可公开展示的条目。', emptyDescription: '内容完成整理和审核后会在此呈现。', navigation: '专题内容导航',
    childTerms: '先认识这些词', childMore: '再看看相关人物和事物', searchLabel: '检索淮河文化专区', searchPlaceholder: '搜索术语、人物、本草或关键词', searchAll: '当前展示全部专题内容', searchResult: '已筛选出 {{count}} 条专题内容', searchEmpty: '没有找到匹配的专题内容。',
  },
  en: {
    loading: 'Opening topic materials…', notFoundEyebrow: 'TOPIC NOT FOUND', notFound: 'This topic does not exist or is not published',
    notFoundDescription: 'The topic may still be under review, or its address may have changed.', back: 'Back to Cultural Topics',
    errorEyebrow: 'CONNECTION INTERRUPTED', error: 'This topic is temporarily unavailable', errorDescription: 'Check your connection and try again.', retry: 'Reload topic',
    missingSummary: 'The research introduction for this topic is being prepared.', overview: 'Topic data overview', items: 'topic records', terms: 'core terms', types: 'material types',
    empty: 'This topic has no public records yet.', emptyDescription: 'Reviewed materials will appear here when ready.', navigation: 'Topic contents',
    childTerms: 'Start with these words', childMore: 'Then explore related people and objects', searchLabel: 'Search Huaihe cultural topic', searchPlaceholder: 'Search terms, people, herbs, or keywords', searchAll: 'Showing all topic records', searchResult: '{{count}} topic records matched', searchEmpty: 'No topic records match this search.',
  },
} as const

function errorStatus(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status
}

function groupEntries(items: TopicEntry[]) {
  const groups = new Map<string, TopicEntry[]>()
  items.forEach((item) => groups.set(item.entry_type, [...(groups.get(item.entry_type) ?? []), item]))
  return [...groups.entries()].sort(([left], [right]) => {
    const leftIndex = entryTypeOrder.indexOf(left)
    const rightIndex = entryTypeOrder.indexOf(right)
    return (leftIndex < 0 ? 99 : leftIndex) - (rightIndex < 0 ? 99 : rightIndex) || left.localeCompare(right)
  })
}

function bubbleEntries(items: TopicEntry[]) {
  const selected: TopicEntry[] = []
  entryTypeOrder.forEach((type) => {
    const entry = items.find((item) => item.entry_type === type)
    if (entry) selected.push(entry)
  })
  items.forEach((item) => {
    if (selected.length < 7 && !selected.some((selectedItem) => selectedItem.id === item.id)) selected.push(item)
  })
  return selected.slice(0, 7)
}

const bubbleLayouts = [
  { left: '48%', delay: '-2s', duration: '13s', size: '5.5rem', staticTop: '20%' },
  { left: '64%', delay: '-8s', duration: '15s', size: '6.5rem', staticTop: '38%' },
  { left: '76%', delay: '-4s', duration: '12s', size: '4.75rem', staticTop: '17%' },
  { left: '88%', delay: '-10s', duration: '16s', size: '5.75rem', staticTop: '48%' },
  { left: '56%', delay: '-12s', duration: '17s', size: '5.125rem', staticTop: '58%' },
  { left: '71%', delay: '-6s', duration: '14s', size: '6rem', staticTop: '68%' },
  { left: '94%', delay: '-1s', duration: '13s', size: '4.5rem', staticTop: '25%' },
] as const

export default function TopicDetailPage() {
  const { slug = '' } = useParams()
  const { i18n } = useTranslation()
  const language = (i18n.resolvedLanguage ?? i18n.language).startsWith('zh') ? 'zh' : 'en'
  const copy = detailLabels[language]
  const isHuaihe = slug === 'huaihe-culture'
  const { isChildMode } = useChildMode()
  const [retryKey, setRetryKey] = useState(0)
  const [topicSearch, setTopicSearch] = useState('')
  const requestKey = `${slug}:${retryKey}`
  const [result, setResult] = useState<{
    key: string
    status: 'ready' | 'error' | 'not-found'
    topic: PublicTopicDetail | null
  }>({ key: '', status: 'ready', topic: null })

  useEffect(() => {
    let active = true
    void getTopic(slug)
      .then((nextTopic) => {
        if (active) {
          setResult({ key: requestKey, status: 'ready', topic: nextTopic })
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setResult({
            key: requestKey,
            status: errorStatus(error) === 404 ? 'not-found' : 'error',
            topic: null,
          })
        }
      })
    return () => { active = false }
  }, [requestKey, slug])

  const status = result.key === requestKey ? result.status : 'loading'
  const topic = result.topic
  const normalizedTopicSearch = topicSearch.trim().toLowerCase()
  const filteredEntries = useMemo(() => {
    const entries = topic?.items ?? []
    if (!normalizedTopicSearch) return entries
    return entries.filter((item) => entrySearchText(item).includes(normalizedTopicSearch))
  }, [normalizedTopicSearch, topic])
  const groups = useMemo(() => groupEntries(filteredEntries), [filteredEntries])
  const hasNonTermEntries = groups.some(([type]) => type !== 'term')
  const materialTypeCount = topic ? Object.keys(topic.entry_type_counts).length : 0
  const itemLabel = language === 'en' && topic ? `topic ${topic.item_count === 1 ? 'record' : 'records'}` : copy.items
  const termLabel = language === 'en' && topic ? `core ${topic.term_count === 1 ? 'term' : 'terms'}` : copy.terms
  const typeLabel = language === 'en' ? `material ${materialTypeCount === 1 ? 'type' : 'types'}` : copy.types
  const topicTitle = isHuaihe
    ? (language === 'zh' ? '淮河文脉' : 'Huaihe Cultural Threads')
    : topic?.title
  const topicEyebrow = isHuaihe
    ? (language === 'zh' ? '淮河文化专题' : 'HUAIHE CULTURAL TOPIC')
    : 'CULTURAL RESEARCH DOSSIER'
  const topicDescription = isHuaihe
    ? (language === 'zh' ? '沿水而生的词语、人物与地方记忆' : 'Words, people, and local memories born along the water.')
    : (topic?.summary || copy.missingSummary)

  if (status === 'loading') {
    return <div aria-busy="true" className="topic-detail"><p className="topics-status">{copy.loading}</p></div>
  }

  if (status === 'not-found') {
    return (
      <div className="topic-detail topic-detail--message">
        <p className="topic-detail__eyebrow">{copy.notFoundEyebrow}</p>
        <h1>{copy.notFound}</h1>
        <p>{copy.notFoundDescription}</p>
        <Link to="/topics">{copy.back}</Link>
      </div>
    )
  }

  if (status === 'error' || !topic) {
    return (
      <div className="topic-detail topic-detail--message" role="alert">
        <p className="topic-detail__eyebrow">{copy.errorEyebrow}</p>
        <h1>{copy.error}</h1>
        <p>{copy.errorDescription}</p>
        <button onClick={() => setRetryKey((value) => value + 1)} type="button">{copy.retry}</button>
        <Link to="/topics">{copy.back}</Link>
      </div>
    )
  }

  return (
    <div className={`topic-detail${isHuaihe ? ' topic-detail--huaihe' : ''}`}>
      <Link className="topic-detail__back" to="/topics">← {copy.back}</Link>
      {isHuaihe ? (
        <section aria-label={language === 'zh' ? '淮河文脉导览' : 'Huaihe cultural guide'} className="huaihe-hero">
          <div className="huaihe-hero__copy">
            <p className="huaihe-hero__eyebrow"><span>{topicEyebrow}</span><span aria-hidden="true"> · HUAIHE CULTURAL DOSSIER</span></p>
            <h1>{topicTitle}</h1>
            <p className="huaihe-hero__subtitle">{topicDescription}</p>
            <p className="huaihe-hero__description">{language === 'zh' ? '循着淮河水系，连接民俗、本草、历史人物与地域表达，阅读一方文化如何生长、交流与传承。' : 'Follow the Huaihe waterways through folk customs, herbs, historic figures, and local expressions.'}</p>
            <div aria-label={copy.overview} className="huaihe-hero__stats">
              <span className="huaihe-hero__stat--term"><strong>{topic.entry_type_counts.term ?? topic.term_count}</strong><small>{language === 'zh' ? '核心术语' : 'Core terms'}</small></span>
              <span className="huaihe-hero__stat--person"><strong>{topic.entry_type_counts.person ?? 0}</strong><small>{language === 'zh' ? '文化人物' : 'Cultural figures'}</small></span>
              <span className="huaihe-hero__stat--herb"><strong>{topic.entry_type_counts.herb ?? 0}</strong><small>{language === 'zh' ? '淮河本草' : 'Huaihe herbs'}</small></span>
            </div>
            <div className="huaihe-hero__search">
              <label htmlFor="topic-search">{copy.searchLabel}</label>
              <div><span aria-hidden="true">⌕</span><input id="topic-search" onChange={(event) => setTopicSearch(event.target.value)} placeholder={copy.searchPlaceholder} type="search" value={topicSearch} />{topicSearch ? <button onClick={() => setTopicSearch('')} type="button">{language === 'zh' ? '清空' : 'Clear'}</button> : null}</div>
              <p>{normalizedTopicSearch ? copy.searchResult.replace('{{count}}', String(filteredEntries.length)) : copy.searchAll}</p>
            </div>
          </div>
          <div aria-hidden="true" className="huaihe-hero__bubbles" data-testid="huaihe-bubble-field">
            {bubbleEntries(filteredEntries).map((entry, index) => {
              const layout = bubbleLayouts[index]
              return <span
                className={`huaihe-bubble huaihe-bubble--${entry.entry_type}`}
                data-testid="huaihe-bubble"
                key={entry.id}
                style={{
                  '--bubble-size': layout.size,
                  '--bubble-static-top': layout.staticTop,
                  animationDelay: layout.delay,
                  animationDuration: layout.duration,
                  left: layout.left,
                } as CSSProperties}
              >{entry.title}</span>
            })}
          </div>
          <div aria-hidden="true" className="huaihe-hero__river" data-testid="huaihe-river" />
        </section>
      ) : <PageIntro eyebrow={topicEyebrow} title={topicTitle ?? topic.title} description={topicDescription} />}

      {!isHuaihe ? <section aria-label={copy.overview} className="topics-overview topic-detail__overview">
        <div><strong>{topic.item_count}</strong><span>{itemLabel}</span></div>
        <div><strong>{topic.term_count}</strong><span>{termLabel}</span></div>
        <div><strong>{materialTypeCount}</strong><span>{typeLabel}</span></div>
      </section> : null}

      {topic.items.length && !isHuaihe ? (
        <section className="topic-detail__search" aria-label={copy.searchLabel}>
          <label htmlFor="topic-search">{copy.searchLabel}</label>
          <div>
            <input
              id="topic-search"
              onChange={(event) => setTopicSearch(event.target.value)}
              placeholder={copy.searchPlaceholder}
              type="search"
              value={topicSearch}
            />
            {topicSearch ? <button onClick={() => setTopicSearch('')} type="button">{language === 'zh' ? '清空' : 'Clear'}</button> : null}
          </div>
          <p>{normalizedTopicSearch ? copy.searchResult.replace('{{count}}', String(filteredEntries.length)) : copy.searchAll}</p>
        </section>
      ) : null}

      {filteredEntries.length && !isHuaihe ? <CulturalKnowledgeMap childMode={isChildMode} entries={filteredEntries} language={language} /> : null}

      {isHuaihe ? <div className="huaihe-stream-intro"><h2>{language === 'zh' ? <>沿着水脉，<br />阅读地方文化</> : <>Read local culture<br />along the river</>}</h2><p>{language === 'zh' ? '从人物、物产、技艺与地方记忆出发，顺着一条条知识支流认识淮河文化的丰富面貌。' : 'Begin with people, produce, crafts, and local memory, then follow each branch of knowledge.'}</p></div> : null}

      {topic.items.length === 0 ? (
        <section className="topics-status">
          <h2>{copy.empty}</h2>
          <p>{copy.emptyDescription}</p>
          <Link to="/topics">{copy.back}</Link>
        </section>
      ) : filteredEntries.length === 0 ? (
        <section className="topics-status">
          <h2>{copy.searchEmpty}</h2>
          <button onClick={() => setTopicSearch('')} type="button">{language === 'zh' ? '清空检索' : 'Clear search'}</button>
        </section>
      ) : (
        <>
          <nav aria-label={copy.navigation} className="topic-detail__nav">
            {groups.map(([type, entries]) => (
              <a href={`#topic-section-${type}`} key={type}>{labelForEntryType(type, language)} <span>{entries.length}</span></a>
            ))}
          </nav>
          {isChildMode ? (
            <aside className="topic-detail__child-guide">
              <em>儿童探索路线</em><strong>{copy.childTerms}</strong>
              {hasNonTermEntries ? <span>{copy.childMore}</span> : null}
            </aside>
          ) : null}
          <div className="topic-detail__sections">
            {groups.map(([type, entries]) => (
              <TopicEntrySection
                entries={entries}
                id={`topic-section-${type}`}
                key={type}
                title={labelForEntryType(type, language)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
