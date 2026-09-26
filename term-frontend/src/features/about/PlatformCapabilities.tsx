import { Link } from 'react-router-dom'
import type { AboutCopy } from './aboutCopy'

export default function PlatformCapabilities({ copy }: { copy: AboutCopy }) {
  return (
    <section className="about-section" aria-labelledby="about-capabilities-title">
      <div className="about-section__heading">
        <p className="about-eyebrow">{copy.capabilitiesEyebrow}</p>
        <h2 id="about-capabilities-title">{copy.capabilitiesTitle}</h2>
      </div>
      <div className="about-capabilities">
        {copy.capabilities.map((capability, index) => (
          <article key={capability.to}>
            <span aria-hidden="true">0{index + 1}</span>
            <h3>{capability.title}</h3>
            <p>{capability.description}</p>
            <Link to={capability.to}>{capability.linkLabel}<span aria-hidden="true"> →</span></Link>
          </article>
        ))}
      </div>
    </section>
  )
}
