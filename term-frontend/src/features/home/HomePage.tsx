import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { listTopics } from '../../services/knowledgeApi'
import type { TopicSummary } from '../../types/knowledge'
import './home.css'

const entrances = [
  ['术语检索', '检索已发布术语、定义、文化说明与多语表达。', '/discover', '进入术语检索'],
  ['术语共建', '提交新的术语资料，等待管理员审核后进入术语库。', '/co-construction', '参与术语共建'],
  ['文化专题', '按文化脉络组织术语、人物与地方知识线索。', '/topics', '浏览文化专题'],
] as const

export default function HomePage() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [topics, setTopics] = useState<TopicSummary[] | null>(null)
  const [topicLoadFailed, setTopicLoadFailed] = useState(false)

  useEffect(() => {
    let active = true
    listTopics()
      .then((loadedTopics) => {
        if (active) setTopics(loadedTopics)
      })
      .catch(() => {
        if (active) setTopicLoadFailed(true)
      })
    return () => { active = false }
  }, [])

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = query.trim()
    navigate(normalized ? `/discover?q=${encodeURIComponent(normalized)}` : '/discover')
  }

  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero__copy">
          <p className="home-eyebrow">MULTILINGUAL TERMINOLOGY PLATFORM</p>
          <h1 id="home-title">中国特色话语多语术语库</h1>
          <p className="home-hero__introduction">
            面向国际传播、外语教学与区域文化阐释，提供中国特色话语术语检索、文化说明、多语表达与共建审核的一体化平台。
          </p>
          <form className="home-hero__search" onSubmit={submitSearch}>
            <label htmlFor="home-term-search">检索术语</label>
            <div><input id="home-term-search" onChange={(event) => setQuery(event.target.value)} placeholder="搜索术语、译名或文化概念" type="search" value={query} /><button type="submit">开始检索</button></div>
          </form>
          <div className="home-hero__actions">
            <Link className="home-primary-link" to="/discover">进入术语检索</Link>
            <Link className="home-secondary-link" to="/co-construction">参与术语共建</Link>
          </div>
        </div>
        <aside className="home-hero__preview" aria-label="术语库预览">
          <div className="home-search-preview">搜索术语：和而不同 / 淮河文化 / 文化强国</div>
          <article><strong>和而不同</strong><span>核心术语</span></article>
          <article><strong>淮河文化</strong><span>区域文化</span></article>
          <article><strong>文化强国</strong><span>当代表达</span></article>
        </aside>
      </section>

      <section className="home-section" aria-labelledby="home-entry-title">
        <p className="home-eyebrow">PLATFORM ENTRANCES</p>
        <h2 id="home-entry-title">从这里开始使用术语库</h2>
        <nav aria-label="平台使用路径" className="home-capability-grid">
          {entrances.map(([title, description, href, link], index) => (
            <article key={href}>
              <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <h3>{title}</h3>
              <p>{description}</p>
              <Link to={href}>{link}</Link>
            </article>
          ))}
          {isAdmin ? (
            <article>
              <h3>术语管理</h3>
              <p>维护正式术语，审核用户共建内容，管理发布状态。</p>
              <Link to="/manage">进入术语管理</Link>
            </article>
          ) : null}
        </nav>
      </section>

      <section className="home-topic-directory" aria-labelledby="home-topic-title">
        <header className="home-topic-directory__header">
          <div>
            <p className="home-eyebrow">CULTURAL COLLECTIONS</p>
            <h2 id="home-topic-title">文化专题总览</h2>
            <p>从地域文化到时代话语，沿不同知识脉络进入术语档案。</p>
          </div>
          <Link className="home-topic-directory__all" to="/topics">查看全部文化专题</Link>
        </header>
        {topics ? (
          <nav aria-label="首页文化专题目录" className="home-topic-directory__list">
            {topics.map((topic, index) => (
              <Link aria-label={`进入${topic.title}专题`} key={topic.slug} to={`/topics/${topic.slug}`}>
                <span className="home-topic-directory__index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <strong>{topic.title}</strong>
                <span>{topic.term_count} 个术语</span>
                <span className="home-topic-directory__arrow" aria-hidden="true">↗</span>
              </Link>
            ))}
          </nav>
        ) : topicLoadFailed ? (
          <p className="home-topic-directory__status" role="status">专题目录暂时无法加载，可进入完整专题页查看。</p>
        ) : (
          <p className="home-topic-directory__status" role="status">正在加载文化专题…</p>
        )}
      </section>
    </div>
  )
}
