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

function provenanceItems(source: SourceDetail) {
  return [
    ['来源类型', source.source_type],
    ['语种', source.language_code],
    ['权威级别', source.authority_level],
    ['历史来源值', source.legacy_value],
  ].filter(([, value]) => Boolean(value?.trim())) as Array<[string, string]>
}

export default function EvidencePanel({ sources }: EvidencePanelProps) {
  if (!sources.length) return null

  return (
    <section aria-labelledby="evidence-title" className="term-profile-panel evidence-panel">
      <div className="term-profile-panel__heading">
        <p className="term-profile-panel__eyebrow">SOURCES &amp; EVIDENCE</p>
        <h2 id="evidence-title">来源与依据</h2>
      </div>
      <ol className="evidence-panel__list">
        {sources.map((source) => {
          const externalUrl = safeExternalUrl(source.url)
          const qualifiers = provenanceItems(source)
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
              {qualifiers.length ? (
                <ul aria-label={`${source.title} 的来源资质信息`} className="evidence-panel__provenance">
                  {qualifiers.map(([label, value]) => <li key={label}>{`${label}：${value}`}</li>)}
                </ul>
              ) : null}
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
