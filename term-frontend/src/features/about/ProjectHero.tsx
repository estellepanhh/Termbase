import type { AboutCopy } from './aboutCopy'

export default function ProjectHero({ copy }: { copy: AboutCopy }) {
  return (
    <header className="about-hero">
      <div className="about-hero__stamp" aria-hidden="true">文<br />译</div>
      <div className="about-hero__content">
        <p className="about-eyebrow">{copy.eyebrow}</p>
        <h1>{copy.heroTitle}</h1>
        <p className="about-hero__description">{copy.heroDescription}</p>
        <a className="about-primary-link" href="#outcomes">{copy.heroAction}<span aria-hidden="true"> ↓</span></a>
      </div>
      <p className="about-hero__side" aria-hidden="true">LANGUAGE · CULTURE · KNOWLEDGE</p>
    </header>
  )
}
