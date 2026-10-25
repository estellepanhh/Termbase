import type { SourceDetail } from '../../types/knowledge'

type EvidencePanelProps = {
  sources: SourceDetail[]
}

function safeExternalUrl(value: string | null) {
  if (!value) return null

  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

export default function EvidencePanel({ sources }: EvidencePanelProps) {
  if (!sources.length) return null

  return (
    <section aria-labelledby="evidence-title" className="term-profile-panel evidence-panel" id="evidence">
      <div className="term-profile-panel__heading">
        <p className="term-profile-panel__eyebrow">SOURCES &amp; EVIDENCE</p>
        <h2 id="evidence-title">来源与依据</h2>
      </div>
      <ol className="evidence-panel__list">
        {sources.map((source) => {
          const externalUrl = safeExternalUrl(source.url)
          return (
            <li className="evidence-panel__source" key={source.id}>
              <div className="evidence-panel__source-heading">
                <h3>{source.title}</h3>
                {externalUrl ? (
                  <a aria-label={`访问来源：${source.title}`} href={externalUrl} rel="noreferrer noopener" target="_blank">
                    访问来源
                  </a>
                ) : null}
              </div>
              <p className="evidence-panel__metadata">
                {[source.organization, source.citation, source.published_at].filter(Boolean).join(' · ')}
              </p>
              {source.summary ? <p className="evidence-panel__summary">{source.summary}</p> : null}
              {source.evidence.length ? (
                <ul className="evidence-panel__excerpt-list">
                  {source.evidence.map((evidence) => (
                    <li key={evidence.id}>
                      {evidence.original_excerpt ? <blockquote>{evidence.original_excerpt}</blockquote> : null}
                      {evidence.translated_excerpt ? <p>{evidence.translated_excerpt}</p> : null}
                      {evidence.locator ? <p className="evidence-panel__locator">{evidence.locator}</p> : null}
                      {evidence.note ? <p className="evidence-panel__note">证据说明：{evidence.note}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
