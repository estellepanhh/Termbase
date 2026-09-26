import type { ProjectOverview } from '../../types/knowledge'
import type { AboutCopy } from './aboutCopy'

type OutcomeStatus = 'loading' | 'ready' | 'error'
const fields: (keyof ProjectOverview)[] = ['term_count', 'translation_count', 'language_count', 'published_topic_count']

export default function OutcomeOverview({ copy, overview, status, onRetry }: {
  copy: AboutCopy
  overview: ProjectOverview | null
  status: OutcomeStatus
  onRetry: () => void
}) {
  return (
    <section className="about-section about-outcomes" id="outcomes" aria-labelledby="about-outcomes-title" tabIndex={-1}>
      <div className="about-section__heading">
        <p className="about-eyebrow">{copy.outcomesEyebrow}</p>
        <h2 id="about-outcomes-title">{copy.outcomesTitle}</h2>
        <p>{copy.outcomesDescription}</p>
      </div>
      <div aria-busy={status === 'loading'} aria-live="polite">
        {status === 'loading' ? (
          <div className="about-status">
            <button disabled type="button">{copy.loading}</button>
          </div>
        ) : null}
        {status === 'error' ? (
          <div className="about-status">
            <p>{copy.error}</p>
            <button onClick={onRetry} type="button">{copy.retry}</button>
          </div>
        ) : null}
        {status === 'ready' && overview ? (
          <dl className="about-metrics">
            {fields.map((field) => (
              <div key={field}>
                <dd>{overview[field].toLocaleString()}</dd>
                <dt>{copy.outcomeLabels[field]}</dt>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </section>
  )
}
