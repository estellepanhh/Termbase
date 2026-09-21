import { useEffect, useMemo, useState } from 'react'
import PageIntro from '../../components/editorial/PageIntro'
import SectionHeading from '../../components/editorial/SectionHeading'
import { useChildMode } from '../../context/ChildModeContext'
import { listTopics } from '../../services/knowledgeApi'
import type { TopicSummary } from '../../types/knowledge'
import TopicCard from './TopicCard'
import './topics.css'

export default function TopicsPage() {
  const { isChildMode } = useChildMode()
  const [topics, setTopics] = useState<TopicSummary[] | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let active = true
    void listTopics()
      .then((nextTopics) => {
        if (active) {
          setTopics(nextTopics)
          setStatus('ready')
        }
      })
      .catch(() => {
        if (active) setStatus('error')
      })
    return () => { active = false }
  }, [retryKey])

  const totals = useMemo(() => ({
    items: topics?.reduce((sum, topic) => sum + topic.item_count, 0) ?? 0,
    terms: topics?.reduce((sum, topic) => sum + topic.term_count, 0) ?? 0,
  }), [topics])

  return (
    <div className="topics-page">
      <PageIntro
        eyebrow="CURATED CULTURAL RESEARCH"
        title="文化专题"
        description={isChildMode
          ? '和孩子一起看专题，从熟悉的词语、人物和事物认识中国文化。'
          : '把术语、人物与地方知识组织成可追溯的研究单元，观察中国特色话语如何进入多语传播。'}
      />

      {isChildMode ? <p className="topics-page__child-note">和孩子一起看专题</p> : null}

      {topics?.length ? (
        <section aria-label="文化专题数据概览" className="topics-overview">
          <div><strong>{topics.length}</strong><span>个已发布专题</span></div>
          <div><strong>{totals.items}</strong><span>条专题内容</span></div>
          <div><strong>{totals.terms}</strong><span>个关联术语</span></div>
        </section>
      ) : null}

      <section aria-busy={status === 'loading'} aria-live="polite" className="topics-collection">
        <SectionHeading
          index="01"
          title="从专题进入文化语境"
          description="每个专题都连接术语档案与相关文化材料。"
        />
        {status === 'loading' ? <p className="topics-status">正在整理专题资料…</p> : null}
        {status === 'error' ? (
          <div className="topics-status" role="alert">
            <p>专题暂时无法加载，请检查网络后重试。</p>
            <button onClick={() => { setStatus('loading'); setRetryKey((value) => value + 1) }} type="button">重新加载专题</button>
          </div>
        ) : null}
        {status === 'ready' && topics?.length === 0 ? (
          <div className="topics-status">
            <h2>暂时没有已发布的文化专题。</h2>
            <p>专题资料完成整理与审核后会在这里呈现。</p>
          </div>
        ) : null}
        {topics?.length ? (
          <div className="topics-grid">
            {topics.map((topic) => <TopicCard key={topic.slug} topic={topic} />)}
          </div>
        ) : null}
      </section>
    </div>
  )
}
