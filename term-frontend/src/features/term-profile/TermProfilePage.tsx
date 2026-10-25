import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getTerm } from '../../services/knowledgeApi'
import type { TermProfile } from '../../types/knowledge'
import EvidencePanel from './EvidencePanel'
import TranslationPanel from './TranslationPanel'
import './term-profile.css'
import { useChildMode } from '../../context/ChildModeContext'
import ProfileSectionNav from './ProfileSectionNav'
import CulturalInterpretations from './CulturalInterpretations'

type LoadStatus = 'loading' | 'ready' | 'error' | 'not-found'

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim())
}

function isNotFoundError(error: unknown) {
  return typeof error === 'object'
    && error !== null
    && 'response' in error
    && (error as { response?: { status?: unknown } }).response?.status === 404
}

function ProfileStatus({ status, onRetry }: { status: LoadStatus; onRetry: () => void }) {
  if (status === 'loading') {
    return <p aria-live="polite" className="term-profile-status">正在加载术语档案…</p>
  }

  if (status === 'not-found') {
    return (
      <section aria-labelledby="term-not-found-title" className="term-profile-status">
        <h1 id="term-not-found-title">未找到该术语</h1>
        <p>该术语可能已被移动，或链接地址不正确。</p>
        <Link to="/discover">返回术语探索</Link>
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section aria-live="assertive" className="term-profile-status" role="alert">
        <h1>术语档案暂时无法加载</h1>
        <p>请检查网络连接后重试。</p>
        <button onClick={onRetry} type="button">重试加载术语</button>
      </section>
    )
  }

  return null
}

function ContextPanel({ profile }: { profile: TermProfile }) {
  const contexts = profile.contexts.filter((item) => item.context_code !== 'children')
  if (!contexts.length) return null

  return (
    <section aria-labelledby="contexts-title" className="term-profile-panel" id="contexts">
      <div className="term-profile-panel__heading">
        <p className="term-profile-panel__eyebrow">USAGE CONTEXTS</p>
        <h2 id="contexts-title">适用场景</h2>
      </div>
      <div className="term-profile-card-list">
        {contexts.map((context) => (
          <article className="term-profile-card" key={context.context_code}>
            <div className="term-profile-card__title-row">
              <h3>{context.context_name_zh}</h3>
              <span>{context.style}</span>
            </div>
            {hasText(context.description) ? <p>{context.description}</p> : null}
            {hasText(context.explanation) ? <p className="term-profile-card__detail">{context.explanation}</p> : null}
            {hasText(context.example) ? <blockquote>{context.example}</blockquote> : null}
            {hasText(context.audience) ? <p className="term-profile-card__audience">面向：{context.audience}</p> : null}
          </article>
        ))}
      </div>
    </section>
  )
}

function CulturalNotesPanel({ profile }: { profile: TermProfile }) {
  if (!profile.cultural_notes.length) return null

  return (
    <section aria-labelledby="cultural-notes-title" className="term-profile-panel cultural-notes-panel" id="cultural-notes">
      <div className="term-profile-panel__heading">
        <p className="term-profile-panel__eyebrow">CROSS-CULTURAL NOTES</p>
        <h2 id="cultural-notes-title">跨文化理解提示</h2>
      </div>
      <div className="term-profile-card-list">
        {profile.cultural_notes.map((note) => (
          <article className="term-profile-card" key={note.target_culture}>
            <h3>{note.target_culture}</h3>
            {hasText(note.difference_summary) ? <p>{note.difference_summary}</p> : null}
            {hasText(note.literal_risk) ? <p><strong>直译风险：</strong>{note.literal_risk}</p> : null}
            {hasText(note.misconception) ? <p><strong>易见误解：</strong>{note.misconception}</p> : null}
            {hasText(note.recommendation) ? <p><strong>表达建议：</strong>{note.recommendation}</p> : null}
          </article>
        ))}
      </div>
    </section>
  )
}

function ConnectionsPanel({ profile }: { profile: TermProfile }) {
  if (!profile.relations.length && !profile.topics.length) return null

  return (
    <section aria-labelledby="connections-title" className="term-profile-panel term-profile-connections">
      <div className="term-profile-panel__heading">
        <p className="term-profile-panel__eyebrow">CONNECTIONS</p>
        <h2 id="connections-title">相关概念与专题</h2>
      </div>
      {profile.relations.length ? (
        <div>
          <h3 className="term-profile-connections__label">相关概念</h3>
          <ul className="term-profile-link-list">
            {profile.relations.map((relation) => {
              const targetIsCurrent = relation.target_term_id === profile.id
              const id = targetIsCurrent ? relation.source_term_id : relation.target_term_id
              const name = targetIsCurrent ? relation.source_term_name_zh : relation.target_term_name_zh
              return <li key={`${relation.direction}-${relation.relation_type}-${id}`}><Link to={`/terms/${id}`}>{name}</Link><span>{relation.relation_type}</span></li>
            })}
          </ul>
        </div>
      ) : null}
      {profile.topics.length ? (
        <div>
          <h3 className="term-profile-connections__label">文化专题</h3>
          <ul className="term-profile-link-list">
            {profile.topics.map((topic) => <li key={topic.slug}><Link to={`/topics/${encodeURIComponent(topic.slug)}`}>{topic.title}</Link></li>)}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

function ProfileContent({ profile }: { profile: TermProfile }) {
  const { isChildMode } = useChildMode()
  const childContext = profile.contexts.find((item) => item.context_code === 'children' && hasText(item.explanation))
  const interpretations = profile.interpretations?.length
    ? profile.interpretations
    : (hasText(profile.cultural_connotation) ? [{
      index: 1,
      title: profile.culture_category || '文化内涵',
      explanation: profile.cultural_connotation,
      definition_zh: profile.definition_zh,
      cultural_connotation: profile.cultural_connotation,
      term_level: profile.term_level,
      culture_category: profile.culture_category,
      record_id: profile.id,
    }] : [])
  const heroDefinition = hasText(profile.definition_zh)
    ? profile.definition_zh
    : interpretations[0]?.explanation || profile.cultural_connotation
  const sections = [
    ...(profile.translations.length ? [{ id: 'translations', label: '多语译法' }] : []),
    ...(interpretations.length ? [{ id: 'connotation', label: '文化内涵' }] : []),
    ...(profile.contexts.some((item) => item.context_code !== 'children') ? [{ id: 'contexts', label: '适用场景' }] : []),
    ...(profile.cultural_notes.length ? [{ id: 'cultural-notes', label: '跨文化提示' }] : []),
    ...(profile.sources.length ? [{ id: 'evidence', label: '来源证据' }] : []),
  ]
  return (
    <article className="term-profile-content">
      <header className="term-profile-hero">
        <p className="term-profile-hero__eyebrow">TERM DOSSIER · {String(profile.id).padStart(3, '0')}</p>
        <h1>{profile.preferred_name_zh}</h1>
        <p className="term-profile-hero__definition">{heroDefinition}</p>
        <div className="term-profile-hero__meta">
          <span>{profile.term_level}</span>
          <span>{profile.culture_category}</span>
          <span>{profile.language_count} 种语言</span>
          <span>{interpretations.length} 条文化解读</span>
          {profile.data_quality === 'legacy_unreviewed' ? <span className="term-profile-hero__warning">历史数据待复核</span> : null}
        </div>
        {profile.names.length ? <p className="term-profile-hero__names">异名：{profile.names.map((name) => name.name).join('、')}</p> : null}
        <svg aria-hidden="true" className="term-profile-hero__motif" data-testid="term-hero-motif" viewBox="0 0 260 120">
          <path d="M8 76C44 22 78 105 118 54s75 38 134-28" />
          <path d="M22 103C70 49 112 126 170 65c24-25 45-26 76-13" />
          <circle cx="9" cy="76" r="5" /><circle cx="75" cy="65" r="4" /><circle cx="118" cy="54" r="6" /><circle cx="184" cy="59" r="4" /><circle cx="252" cy="26" r="6" />
        </svg>
      </header>
      <div className="term-profile-layout">
        <ProfileSectionNav sections={sections} />
        <div className="term-profile-sections">
          {isChildMode ? <section aria-labelledby="child-explanation-title" className="child-explanation-panel">
            <span aria-hidden="true">✦</span><div><p>CHILD-FRIENDLY EXPLANATION</p><h2 id="child-explanation-title">给小朋友的话</h2><p>{childContext?.explanation || profile.definition_zh}</p></div>
          </section> : null}
          <TranslationPanel translations={profile.translations} />
          <CulturalInterpretations interpretations={interpretations} />
          <ContextPanel profile={profile} />
          <CulturalNotesPanel profile={profile} />
          <EvidencePanel sources={profile.sources} />
          <ConnectionsPanel profile={profile} />
        </div>
      </div>
    </article>
  )
}

function TermProfileLoader({ termId }: { termId: number }) {
  const [profile, setProfile] = useState<TermProfile | null>(null)
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let active = true

    void getTerm(termId)
      .then((nextProfile) => {
        if (active) {
          setProfile(nextProfile)
          setStatus('ready')
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setStatus(isNotFoundError(error) ? 'not-found' : 'error')
        }
      })

    return () => {
      active = false
    }
  }, [retryKey, termId])

  return (
    <>
      <ProfileStatus onRetry={() => {
        setProfile(null)
        setStatus('loading')
        setRetryKey((value) => value + 1)
      }} status={status} />
      {status === 'ready' && profile ? <ProfileContent profile={profile} /> : null}
    </>
  )
}

export default function TermProfilePage() {
  const { id } = useParams()
  const rawId = id ?? ''
  const isCanonicalId = /^[1-9]\d*$/.test(rawId)
  const termId = isCanonicalId ? Number(rawId) : Number.NaN
  const isValidId = Number.isSafeInteger(termId) && termId > 0

  return (
    <div className="term-profile-page">
      {isValidId ? <TermProfileLoader key={termId} termId={termId} /> : <ProfileStatus onRetry={() => undefined} status="not-found" />}
    </div>
  )
}
