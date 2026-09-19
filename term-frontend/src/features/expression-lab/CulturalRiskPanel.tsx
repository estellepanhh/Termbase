import type { CulturalRisk } from '../../types/expressionLab'
const labels = { low: '低风险', medium: '中风险', high: '高风险' }
export default function CulturalRiskPanel({ risks }: { risks: CulturalRisk[] }) { return <div className="risk-list">{risks.length ? risks.map((risk, index) => <article className={`risk-card risk-card--${risk.level}`} key={index}><strong>◇ {labels[risk.level]}</strong><p>{risk.issue}</p><p><b>建议：</b>{risk.recommendation}</p></article>) : <p>本次未识别到明确文化风险，仍建议人工复核。</p>}</div> }
