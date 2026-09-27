import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import './home.css'
import ResearchFlow from './ResearchFlow'

const constellationNodes = ['核心层', '本源层', '拓展层', '淮河文化', 'AI 辅助', '人工审校', '多语发布']

const layers = [
  ['本源层', '从中华优秀传统文化中提取概念根基，解释术语背后的思想来源。'],
  ['核心层', '聚焦当代中国话语的关键概念，形成可核验、可翻译、可传播的表达基础。'],
  ['拓展层', '连接区域文化、传播场景与多语表达，让术语进入具体文化叙事。'],
] as const

const capabilities = [
  ['术语探索', '从概念、层级、文化分类进入已发布术语档案。', '/discover', '进入术语探索'],
  ['表达实验室', '把术语依据、受众场景与文化风险组织成表达方案。', '/lab', '进入表达实验室'],
  ['文化专题', '以淮河文化为样板，展示区域文化术语的知识路径。', '/topics', '浏览文化专题'],
  ['项目成果', '查看项目背景、建设路径、阶段成果和研究价值。', '/about', '查看项目介绍'],
] as const

function KnowledgeConstellation() {
  return (
    <div className="knowledge-constellation" aria-label="术语知识星图">
      <div className="knowledge-constellation__rings" aria-hidden="true" />
      {constellationNodes.map((node, index) => (
        <span className={`knowledge-constellation__node node-${index + 1}`} key={node}>{node}</span>
      ))}
      <span className="knowledge-constellation__core">文脉知识工程</span>
    </div>
  )
}

export default function HomePage() {
  const { i18n } = useTranslation()
  const isChinese = (i18n.resolvedLanguage ?? i18n.language ?? 'zh').startsWith('zh')
  const { isAdmin } = useAuth()

  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero__copy">
          <p className="home-eyebrow">CHINESE DISCOURSE TERMINOLOGY PROJECT</p>
          <h1 id="home-title">
            {isChinese ? '中国特色话语多语术语库工程化建设与研究' : 'Chinese Discourse Multilingual Termbase'}
          </h1>
          <p className="home-hero__introduction">
            以术语采集、概念阐释、多语表达、AI 辅助与人工审校构成研究闭环，让中国特色概念在跨文化传播中被准确理解、清晰表达、持续修订。
          </p>
          <div className="home-hero__actions">
            <Link className="home-primary-link" to="/discover">进入术语探索</Link>
            <Link className="home-secondary-link" to="/about">查看项目介绍</Link>
          </div>
        </div>
        <KnowledgeConstellation />
      </section>

      <section className="home-section home-section--flow" aria-labelledby="research-flow-title">
        <p className="home-eyebrow">TERMINOLOGY PRODUCTION LOOP</p>
        <h2 id="research-flow-title">从采集到发布的术语生产闭环</h2>
        <ResearchFlow />
      </section>

      <section className="home-section home-section--layers" aria-labelledby="home-framework-title">
        <div>
          <p className="home-eyebrow">THREE-LAYER KNOWLEDGE SYSTEM</p>
          <h2 id="home-framework-title">三层术语体系支撑当代表达</h2>
          <p className="home-section__introduction">
            平台不只保存词条，而是把概念来源、当代表达和专题场景组织成可追溯的知识结构。
          </p>
        </div>
        <ol className="home-layers">
          {layers.map(([name, description], index) => (
            <li key={name}>
              <span>0{index + 1}</span>
              <h3>{name}</h3>
              <p>{description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="home-topic-preview" aria-labelledby="home-topic-title">
        <div>
          <p className="home-eyebrow">DEMONSTRATION TOPIC</p>
          <h2 id="home-topic-title">淮河文化示范专题</h2>
          <p>以地域文化为入口，呈现“区域文化实践 → 核心术语 → 推荐译法 → 传播场景”的研究路径。</p>
          <Link className="home-primary-link" to="/topics/huaihe-culture">查看淮河文化专题</Link>
        </div>
        <div className="topic-map-preview" aria-hidden="true">
          <span>地域文化</span>
          <span>术语档案</span>
          <span>多语译法</span>
          <span>传播场景</span>
        </div>
      </section>

      <section className="home-section" aria-labelledby="home-capability-title">
        <p className="home-eyebrow">RESEARCH ENTRANCES</p>
        <h2 id="home-capability-title">进入不同研究环节</h2>
        <div className="home-capability-grid">
          {capabilities.map(([title, description, href, link]) => (
            <article key={href}>
              <h3>{title}</h3>
              <p>{description}</p>
              <Link to={href}>{link}</Link>
            </article>
          ))}
          {isAdmin ? (
            <article>
              <h3>术语管理</h3>
              <p>维护草稿、发布状态与术语基础信息，支撑平台持续建设。</p>
              <Link to="/manage">进入术语管理</Link>
            </article>
          ) : null}
        </div>
      </section>
    </div>
  )
}
