import type { AboutCopy } from './aboutCopy'

export default function ResearchWorkflow({ copy }: { copy: AboutCopy }) {
  return (
    <section className="about-section" aria-labelledby="about-workflow-title">
      <div className="about-section__heading">
        <p className="about-eyebrow">{copy.workflowEyebrow}</p>
        <h2 id="about-workflow-title">{copy.workflowTitle}</h2>
        <p>{copy.workflowDescription}</p>
      </div>
      <ol className="about-workflow">
        {copy.workflowStages.map((stage, index) => (
          <li key={stage.title}>
            <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <h3>{stage.title}</h3>
            <p>{stage.description}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
