import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { listTerms } from '../../services/knowledgeApi'
import type { PaginatedTerms, TermSummary } from '../../types/knowledge'
import './home.css'
import ResearchFlow from './ResearchFlow'

type HomeLabels = {
  eyebrow: string
  title: string
  introduction: string
  searchLabel: string
  searchPlaceholder: string
  searchButton: string
  frameworkTitle: string
  frameworkIntroduction: string
  labEyebrow: string
  labTitle: string
  labDescription: string
  labLink: string
  featuredEyebrow: string
  featuredTitle: string
  featuredDescription: string
  loading: string
  empty: string
  error: string
  retry: string
  topicEyebrow: string
  topicTitle: string
  topicDescription: string
  topicLink: string
  resultsEyebrow: string
  resultsTitle: string
  resultsDescription: (total: number) => string
  exploreTerm: string
}

const labels: Record<'zh' | 'en', HomeLabels> = {
  zh: {
    eyebrow: '中国特色话语多语知识平台',
    title: '让中国特色概念被准确理解与表达',
    introduction: '以术语为入口，连接概念阐释、跨文化表达与文化研究，为学术研究和国际传播提供可追溯的知识依据。',
    searchLabel: '搜索术语',
    searchPlaceholder: '输入术语、概念或译名',
    searchButton: '开始检索',
    frameworkTitle: '从概念根基到当代表达',
    frameworkIntroduction: '平台以研究问题而非资料堆叠组织内容，帮助使用者辨识概念的来源、拓展路径与当代表达。',
    labEyebrow: '跨文化表达实验室',
    labTitle: '在具体语境中比较表达的得失',
    labDescription: '围绕受众、文体与传播场景，持续整理可讨论、可修订的表达方案。',
    labLink: '进入表达实验室',
    featuredEyebrow: '精选术语',
    featuredTitle: '从可核验的术语档案开始',
    featuredDescription: '每条术语保留定义、文化分类与推荐译法，便于进入进一步研究。',
    loading: '正在加载精选术语…',
    empty: '精选术语将在资料整理完成后呈现。',
    error: '精选术语暂时无法加载。',
    retry: '重试加载精选术语',
    topicEyebrow: '文化专题',
    topicTitle: '淮河文化示范专题',
    topicDescription: '从区域文化实践出发，探索术语知识如何支持专题研究与叙事表达。',
    topicLink: '查看淮河文化专题',
    resultsEyebrow: '知识建设进展',
    resultsTitle: '以已有资料为基础，持续完善研究网络',
    resultsDescription: (total) => `已收录 ${total} 条术语`,
    exploreTerm: '查看术语档案',
  },
  en: {
    eyebrow: 'Chinese Discourse Multilingual Knowledge Platform',
    title: 'Making Chinese concepts understood and expressed with precision',
    introduction: 'Start with terms, connect conceptual interpretation, intercultural expression, and cultural research through traceable knowledge.',
    searchLabel: 'Search terms',
    searchPlaceholder: 'Enter a term, concept, or translation',
    searchButton: 'Search',
    frameworkTitle: 'From conceptual roots to contemporary expression',
    frameworkIntroduction: 'The platform organizes knowledge around research questions, clarifying each concept’s source, expansion, and present-day expression.',
    labEyebrow: 'Expression Lab',
    labTitle: 'Compare expression in concrete contexts',
    labDescription: 'Explore revisable expression proposals by audience, register, and communication setting.',
    labLink: 'Enter the Expression Lab',
    featuredEyebrow: 'Featured terms',
    featuredTitle: 'Begin with verifiable term records',
    featuredDescription: 'Each record preserves definitions, cultural categories, and recommended translations for further research.',
    loading: 'Loading featured terms…',
    empty: 'Featured terms will appear as records are prepared.',
    error: 'Featured terms are temporarily unavailable.',
    retry: 'Retry loading featured terms',
    topicEyebrow: 'Cultural topics',
    topicTitle: 'Huai River culture demonstration topic',
    topicDescription: 'Starting from regional cultural practice, this topic explores how terminology knowledge can support research and narration.',
    topicLink: 'View the Huai River culture topic',
    resultsEyebrow: 'Knowledge-building progress',
    resultsTitle: 'Growing a research network from available evidence',
    resultsDescription: (total) => `${total} terms recorded`,
    exploreTerm: 'View term record',
  },
}

const layers = [
  ['核心层', '当代中国话语的关键概念，聚焦形成共识与准确表达。'],
  ['拓展层', '在制度、社会与文化实践中不断生长的相关概念与表达。'],
  ['本源层', '植根中华优秀传统文化的思想资源，提供理解与阐释的深层线索。'],
] as const

function TermCard({ term, label }: { term: TermSummary; label: string }) {
  return (
    <article className="home-term-card">
      <div className="home-term-card__meta">
        <span>{term.term_level}</span>
        <span>{term.culture_category}</span>
      </div>
      <h3><Link to={`/terms/${term.id}`}>{term.preferred_name_zh}</Link></h3>
      <p>{term.definition_zh}</p>
      {term.recommended_translation ? <p className="home-term-card__translation">{term.recommended_translation.text}</p> : null}
      <Link aria-label={`${label}：${term.preferred_name_zh}`} className="home-text-link" to={`/terms/${term.id}`}>
        {label}
      </Link>
    </article>
  )
}

export default function HomePage() {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const isChinese = (i18n.resolvedLanguage ?? i18n.language).startsWith('zh')
  const copy = labels[isChinese ? 'zh' : 'en']
  const [query, setQuery] = useState('')
  const [featured, setFeatured] = useState<PaginatedTerms | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  const loadFeatured = async () => {
    setStatus('loading')
    try {
      const response = await listTerms({ page: 1, pageSize: 6 })
      setFeatured(response)
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }

  useEffect(() => {
    let active = true

    void listTerms({ page: 1, pageSize: 6 })
      .then((response) => {
        if (active) {
          setFeatured(response)
          setStatus('ready')
        }
      })
      .catch(() => {
        if (active) {
          setStatus('error')
        }
      })

    return () => {
      active = false
    }
  }, [])

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedQuery = query.trim()
    navigate(trimmedQuery ? `/discover?q=${encodeURIComponent(trimmedQuery)}` : '/discover')
  }

  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <p className="home-eyebrow">{copy.eyebrow}</p>
        <h1 id="home-title">{copy.title}</h1>
        <p className="home-hero__introduction">{copy.introduction}</p>
        <form className="home-search" onSubmit={submitSearch}>
          <label htmlFor="home-term-search">{copy.searchLabel}</label>
          <div className="home-search__controls">
            <input
              id="home-term-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              type="search"
              value={query}
            />
            <button type="submit">{copy.searchButton}</button>
          </div>
        </form>
      </section>

      <section className="home-section home-section--flow" aria-labelledby="research-flow-title"><p className="home-eyebrow">RESEARCH WORKFLOW</p><h2 id="research-flow-title">从术语知识到人工评审</h2><ResearchFlow /></section>

      <section className="home-section" aria-labelledby="home-framework-title">
        <p className="home-eyebrow">Research framework</p>
        <h2 id="home-framework-title">{copy.frameworkTitle}</h2>
        <p className="home-section__introduction">{copy.frameworkIntroduction}</p>
        <ol className="home-layers">
          {layers.map(([name, description], index) => (
            <li key={name}>
              <span className="home-layers__number">0{index + 1}</span>
              <div><h3>{isChinese ? name : ['Core layer', 'Expansion layer', 'Source layer'][index]}</h3><p>{isChinese ? description : 'A distinct research layer connects conceptual evidence with interpretation and expression.'}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="home-callout" aria-labelledby="home-lab-title">
        <p className="home-eyebrow">{copy.labEyebrow}</p>
        <h2 id="home-lab-title">{copy.labTitle}</h2>
        <p>{copy.labDescription}</p>
        <Link className="home-text-link" to="/lab">{copy.labLink}</Link>
      </section>

      <section className="home-section" aria-labelledby="home-featured-title">
        <div className="home-section__header">
          <div><p className="home-eyebrow">{copy.featuredEyebrow}</p><h2 id="home-featured-title">{copy.featuredTitle}</h2></div>
          <p>{copy.featuredDescription}</p>
        </div>
        <div aria-busy={status === 'loading'} aria-live="polite" className="home-featured">
          {status === 'loading' ? <p className="home-status">{copy.loading}</p> : null}
          {status === 'error' ? <div className="home-status"><p>{copy.error}</p><button onClick={() => void loadFeatured()} type="button">{copy.retry}</button></div> : null}
          {status === 'ready' && featured?.data.length === 0 ? <p className="home-status">{copy.empty}</p> : null}
          {status === 'ready' && featured?.data.length ? <div className="home-term-grid">{featured.data.map((term) => <TermCard key={term.id} label={copy.exploreTerm} term={term} />)}</div> : null}
        </div>
      </section>

      <section className="home-callout home-callout--topic" aria-labelledby="home-topic-title">
        <p className="home-eyebrow">{copy.topicEyebrow}</p>
        <h2 id="home-topic-title">{copy.topicTitle}</h2>
        <p>{copy.topicDescription}</p>
        <Link className="home-text-link" to="/topics">{copy.topicLink}</Link>
      </section>

      <section className="home-results" aria-labelledby="home-results-title">
        <p className="home-eyebrow">{copy.resultsEyebrow}</p>
        <h2 id="home-results-title">{copy.resultsTitle}</h2>
        {status === 'ready' && featured ? <p>{copy.resultsDescription(featured.meta.total)}</p> : null}
      </section>
    </div>
  )
}
