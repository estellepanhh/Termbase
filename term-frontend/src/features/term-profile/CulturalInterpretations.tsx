import KnowledgeGlyph from '../../components/KnowledgeGlyph'
import type { CulturalInterpretation } from '../../types/knowledge'

export default function CulturalInterpretations({ interpretations }: { interpretations: CulturalInterpretation[] }) {
  if (!interpretations.length) return null

  return (
    <section aria-labelledby="connotation-title" className="term-profile-panel cultural-interpretations" id="connotation">
      <div className="term-profile-panel__heading cultural-interpretations__heading">
        <div>
          <p className="term-profile-panel__eyebrow">CULTURAL INTERPRETATIONS</p>
          <h2 id="connotation-title">文化内涵</h2>
        </div>
        <p>同一术语在不同知识脉络中的含义与表达依据</p>
      </div>
      <ol className="cultural-interpretations__list">
        {interpretations.map((interpretation) => (
          <li key={interpretation.record_id}>
            <span className="cultural-interpretations__index">{String(interpretation.index).padStart(2, '0')}</span>
            <div className="cultural-interpretations__body">
              <div className="cultural-interpretations__title">
                <KnowledgeGlyph kind="culture" />
                <h3>{interpretation.title}</h3>
              </div>
              <p>{interpretation.explanation}</p>
              <dl>
                <div><dt>研究记录层级</dt><dd>{interpretation.term_level || '待整理'}</dd></div>
                <div><dt>文化分类</dt><dd>{interpretation.culture_category || '待整理'}</dd></div>
              </dl>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
