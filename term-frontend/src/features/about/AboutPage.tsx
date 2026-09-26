import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useChildMode } from '../../context/ChildModeContext'
import { getProjectOverview } from '../../services/knowledgeApi'
import type { ProjectOverview } from '../../types/knowledge'
import { getAboutCopy } from './aboutCopy'
import OutcomeOverview from './OutcomeOverview'
import PlatformCapabilities from './PlatformCapabilities'
import ProjectHero from './ProjectHero'
import ResearchWorkflow from './ResearchWorkflow'
import './about.css'

export default function AboutPage() {
  const { i18n } = useTranslation()
  const { isChildMode } = useChildMode()
  const language = (i18n.resolvedLanguage ?? i18n.language).startsWith('zh') ? 'zh' : 'en'
  const copy = getAboutCopy(language, isChildMode)
  const [overview, setOverview] = useState<ProjectOverview | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const mounted = useRef(false)
  const pending = useRef(false)

  const retryOverview = async () => {
    if (pending.current) return
    pending.current = true
    setStatus('loading')
    try {
      const result = await getProjectOverview()
      if (mounted.current) {
        setOverview(result)
        setStatus('ready')
      }
    } catch {
      if (mounted.current) setStatus('error')
    } finally {
      pending.current = false
    }
  }

  useEffect(() => {
    mounted.current = true
    pending.current = true
    void getProjectOverview()
      .then((result) => {
        if (mounted.current) {
          setOverview(result)
          setStatus('ready')
        }
      })
      .catch(() => {
        if (mounted.current) setStatus('error')
      })
      .finally(() => {
        pending.current = false
      })
    return () => { mounted.current = false }
  }, [])

  return (
    <div className="about-page">
      <ProjectHero copy={copy} />

      <section className="about-section about-origin" aria-labelledby="about-origin-title">
        <div className="about-section__heading">
          <p className="about-eyebrow">{copy.originEyebrow}</p>
          <h2 id="about-origin-title">{copy.originTitle}</h2>
        </div>
        <div className="about-origin__text">{copy.originParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
      </section>

      <ResearchWorkflow copy={copy} />
      <OutcomeOverview copy={copy} onRetry={() => void retryOverview()} overview={overview} status={status} />
      <PlatformCapabilities copy={copy} />

      <section className="about-section" aria-labelledby="about-innovation-title">
        <div className="about-section__heading">
          <p className="about-eyebrow">{copy.innovationEyebrow}</p>
          <h2 id="about-innovation-title">{copy.innovationTitle}</h2>
        </div>
        <div className="about-innovations">
          {copy.innovations.map((item) => <article key={item.title}><h3>{item.title}</h3><p>{item.description}</p></article>)}
        </div>
      </section>

      <section className="about-section" aria-labelledby="about-progress-title">
        <div className="about-section__heading">
          <p className="about-eyebrow">{copy.progressEyebrow}</p>
          <h2 id="about-progress-title">{copy.progressTitle}</h2>
        </div>
        <div className="about-progress">
          <article><h3>{copy.completedTitle}</h3><ul>{copy.completedItems.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article><h3>{copy.ongoingTitle}</h3><ul>{copy.ongoingItems.map((item) => <li key={item}>{item}</li>)}</ul></article>
        </div>
      </section>

      <section className="about-project-note" aria-labelledby="about-project-title">
        <p className="about-eyebrow">{copy.projectEyebrow}</p>
        <h2 id="about-project-title">{copy.projectTitle}</h2>
        <p>{copy.projectDescription}</p>
      </section>
    </div>
  )
}
