import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PageIntro from '../../components/editorial/PageIntro'
import { useChildMode } from '../../context/ChildModeContext'
import { getTopic } from '../../services/knowledgeApi'
import type { PublicTopicDetail, TopicEntry } from '../../types/knowledge'
import { labelForEntryType } from './topicPresentation'
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
    childTerms: '先认识这些词', childMore: '再看看相关人物和事物',
  },
  en: {
    loading: 'Opening topic materials…', notFoundEyebrow: 'TOPIC NOT FOUND', notFound: 'This topic does not exist or is not published',
    notFoundDescription: 'The topic may still be under review, or its address may have changed.', back: 'Back to Cultural Topics',
    errorEyebrow: 'CONNECTION INTERRUPTED', error: 'This topic is temporarily unavailable', errorDescription: 'Check your connection and try again.', retry: 'Reload topic',
    missingSummary: 'The research introduction for this topic is being prepared.', overview: 'Topic data overview', items: 'topic records', terms: 'core terms', types: 'material types',
    empty: 'This topic has no public records yet.', emptyDescription: 'Reviewed materials will appear here when ready.', navigation: 'Topic contents',
    childTerms: 'Start with these words', childMore: 'Then explore related people and objects',
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

export default function TopicDetailPage() {
  const { slug = '' } = useParams()
  const { i18n } = useTranslation()
  const language = (i18n.resolvedLanguage ?? i18n.language).startsWith('zh') ? 'zh' : 'en'
  const copy = detailLabels[language]
  const { isChildMode } = useChildMode()
  const [retryKey, setRetryKey] = useState(0)
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
  const groups = useMemo(() => groupEntries(topic?.items ?? []), [topic])
  const hasNonTermEntries = groups.some(([type]) => type !== 'term')
  const materialTypeCount = topic ? Object.keys(topic.entry_type_counts).length : 0
  const itemLabel = language === 'en' && topic ? `topic ${topic.item_count === 1 ? 'record' : 'records'}` : copy.items
  const termLabel = language === 'en' && topic ? `core ${topic.term_count === 1 ? 'term' : 'terms'}` : copy.terms
  const typeLabel = language === 'en' ? `material ${materialTypeCount === 1 ? 'type' : 'types'}` : copy.types

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
    <div className="topic-detail">
      <Link className="topic-detail__back" to="/topics">← {copy.back}</Link>
      <PageIntro
        eyebrow="CULTURAL RESEARCH DOSSIER"
        title={topic.title}
        description={topic.summary || copy.missingSummary}
      />

      <section aria-label={copy.overview} className="topics-overview topic-detail__overview">
        <div><strong>{topic.item_count}</strong><span>{itemLabel}</span></div>
        <div><strong>{topic.term_count}</strong><span>{termLabel}</span></div>
        <div><strong>{materialTypeCount}</strong><span>{typeLabel}</span></div>
      </section>

      {topic.items.length ? <CulturalKnowledgeMap childMode={isChildMode} entries={topic.items} language={language} /> : null}

      {topic.items.length === 0 ? (
        <section className="topics-status">
          <h2>{copy.empty}</h2>
          <p>{copy.emptyDescription}</p>
          <Link to="/topics">{copy.back}</Link>
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
