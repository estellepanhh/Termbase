import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageIntro from '../../components/editorial/PageIntro'
import { useChildMode } from '../../context/ChildModeContext'
import { getTopic } from '../../services/knowledgeApi'
import type { PublicTopicDetail, TopicEntry } from '../../types/knowledge'
import { labelForEntryType } from './topicPresentation'
import TopicEntrySection from './TopicEntrySection'
import './topics.css'

const entryTypeOrder = ['term', 'person', 'place', 'culture', 'herb']

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

  if (status === 'loading') {
    return <div aria-busy="true" className="topic-detail"><p className="topics-status">正在展开专题资料…</p></div>
  }

  if (status === 'not-found') {
    return (
      <div className="topic-detail topic-detail--message">
        <p className="topic-detail__eyebrow">TOPIC NOT FOUND</p>
        <h1>专题不存在或尚未发布</h1>
        <p>该专题可能仍在整理，或者访问地址已经变化。</p>
        <Link to="/topics">返回文化专题</Link>
      </div>
    )
  }

  if (status === 'error' || !topic) {
    return (
      <div className="topic-detail topic-detail--message" role="alert">
        <p className="topic-detail__eyebrow">CONNECTION INTERRUPTED</p>
        <h1>专题暂时无法加载</h1>
        <p>请检查网络连接后重新尝试。</p>
        <button onClick={() => setRetryKey((value) => value + 1)} type="button">重新加载专题</button>
        <Link to="/topics">返回文化专题</Link>
      </div>
    )
  }

  return (
    <div className="topic-detail">
      <Link className="topic-detail__back" to="/topics">← 返回文化专题</Link>
      <PageIntro
        eyebrow="CULTURAL RESEARCH DOSSIER"
        title={topic.title}
        description={topic.summary || '该专题的研究导语正在整理中。'}
      />

      <section aria-label="专题数据概览" className="topics-overview topic-detail__overview">
        <div><strong>{topic.item_count}</strong><span>条专题内容</span></div>
        <div><strong>{topic.term_count}</strong><span>个核心术语</span></div>
        <div><strong>{Object.keys(topic.entry_type_counts).length}</strong><span>类研究材料</span></div>
      </section>

      {topic.items.length === 0 ? (
        <section className="topics-status">
          <h2>该专题目前没有可公开展示的条目。</h2>
          <p>内容完成整理和审核后会在此呈现。</p>
          <Link to="/topics">返回文化专题</Link>
        </section>
      ) : (
        <>
          <nav aria-label="专题内容导航" className="topic-detail__nav">
            {groups.map(([type, entries]) => (
              <a href={`#topic-section-${type}`} key={type}>{labelForEntryType(type)} <span>{entries.length}</span></a>
            ))}
          </nav>
          {isChildMode ? (
            <aside className="topic-detail__child-guide">
              <strong>先认识这些词</strong>
              {hasNonTermEntries ? <span>再看看相关人物和事物</span> : null}
            </aside>
          ) : null}
          <div className="topic-detail__sections">
            {groups.map(([type, entries]) => (
              <TopicEntrySection
                entries={entries}
                id={`topic-section-${type}`}
                key={type}
                title={labelForEntryType(type)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
