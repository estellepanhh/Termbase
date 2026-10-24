import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PageIntro from '../../components/editorial/PageIntro'
import SectionHeading from '../../components/editorial/SectionHeading'
import { useChildMode } from '../../context/ChildModeContext'
import { listTopics } from '../../services/knowledgeApi'
import type { TopicSummary } from '../../types/knowledge'
import TopicCard from './TopicCard'
import './topics.css'

const pageLabels = {
  zh: {
    title: '文化专题', description: '把术语、人物与地方知识组织成可追溯的研究单元，观察中国特色话语如何进入多语传播。',
    childDescription: '和孩子一起看专题，从熟悉的词语、人物和事物认识中国文化。', childNote: '和孩子一起看专题',
    overview: '文化专题数据概览', published: '个已发布专题', items: '条专题内容', terms: '个关联术语',
    sectionTitle: '从专题进入文化语境', sectionDescription: '每个专题都连接术语档案与相关文化材料。',
    loading: '正在整理专题资料…', error: '专题暂时无法加载，请检查网络后重试。', retry: '重新加载专题',
    emptyTitle: '暂时没有已发布的文化专题。', emptyDescription: '专题资料完成整理与审核后会在这里呈现。',
  },
  en: {
    title: 'Cultural Topics', description: 'Explore traceable research units that connect terminology, cultural figures, and regional knowledge for multilingual communication.',
    childDescription: 'Explore Chinese culture with children through familiar words, people, and objects.', childNote: 'Explore topics with children',
    overview: 'Cultural topic overview', published: 'published topics', items: 'topic records', terms: 'linked terms',
    sectionTitle: 'Enter cultural contexts through topics', sectionDescription: 'Each topic connects term records with related cultural materials.',
    loading: 'Loading topic materials…', error: 'Topics are temporarily unavailable. Check your connection and try again.', retry: 'Reload topics',
    emptyTitle: 'No cultural topics are currently published.', emptyDescription: 'Reviewed topic materials will appear here when ready.',
  },
} as const

export default function TopicsPage() {
  const { i18n } = useTranslation()
  const language = (i18n.resolvedLanguage ?? i18n.language).startsWith('zh') ? 'zh' : 'en'
  const copy = pageLabels[language]
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
        title={copy.title}
        description={isChildMode
          ? copy.childDescription
          : copy.description}
      />

      {isChildMode ? <p className="topics-page__child-note">{copy.childNote}</p> : null}

      {topics?.length ? (
        <section aria-label={copy.overview} className="topics-overview">
          <div><strong>{topics.length}</strong><span>{copy.published}</span></div>
          <div><strong>{totals.items}</strong><span>{copy.items}</span></div>
          <div><strong>{totals.terms}</strong><span>{copy.terms}</span></div>
        </section>
      ) : null}

      <section aria-busy={status === 'loading'} aria-live="polite" className="topics-collection">
        <SectionHeading
          index="01"
          title={copy.sectionTitle}
          description={copy.sectionDescription}
        />
        {status === 'loading' ? <p className="topics-status">{copy.loading}</p> : null}
        {status === 'error' ? (
          <div className="topics-status" role="alert">
            <p>{copy.error}</p>
            <button onClick={() => { setStatus('loading'); setRetryKey((value) => value + 1) }} type="button">{copy.retry}</button>
          </div>
        ) : null}
        {status === 'ready' && topics?.length === 0 ? (
          <div className="topics-status">
            <h2>{copy.emptyTitle}</h2>
            <p>{copy.emptyDescription}</p>
          </div>
        ) : null}
        {topics?.length ? (
          <nav aria-label={language === 'zh' ? '文化专题图志' : 'Cultural topic atlas'} className="topics-grid topics-atlas">
            {topics.map((topic, index) => <TopicCard index={index} key={topic.slug} topic={topic} />)}
          </nav>
        ) : null}
      </section>
    </div>
  )
}
