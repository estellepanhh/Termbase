import { Link } from 'react-router-dom'
import { useState } from 'react'
import type { ExpressionAnalysis } from '../../types/expressionLab'
import AlternativeComparison from './AlternativeComparison'
import CulturalRiskPanel from './CulturalRiskPanel'
import ReferenceList from './ReferenceList'
import { downloadTextFile, toExpressionJson, toExpressionMarkdown } from './exportExpressionReport'

export default function ExpressionReport({ analysis, termNames }: { analysis: ExpressionAnalysis; termNames: Record<number, string>; termIds?: number[] }) {
  const [copyStatus, setCopyStatus] = useState('')
  const { report } = analysis
  const copy = async () => { try { await navigator.clipboard.writeText(report.recommended.text); setCopyStatus('已复制首选表达') } catch { setCopyStatus('复制失败，请手动选择文本') } }
  return <section aria-labelledby="expression-report-title" className="expression-report">
    <header><div><p>VALIDATED AI DRAFT</p><h2 id="expression-report-title">跨文化表达研究报告</h2></div><strong className="unreviewed-badge">AI生成、尚未人工复核</strong></header>
    <div className="report-actions"><button onClick={() => void copy()} type="button">复制首选表达</button><button onClick={() => downloadTextFile(analysis, toExpressionMarkdown(analysis), 'md')} type="button">下载 Markdown</button><button onClick={() => downloadTextFile(analysis, toExpressionJson(analysis), 'json')} type="button">下载 JSON</button></div>
    {copyStatus ? <p role="status">{copyStatus}</p> : null}
    <article className="recommended-card"><span>RECOMMENDED EXPRESSION</span><h3>{report.recommended.text}</h3><p>{report.recommended.rationale}</p><div>{report.recommended.strategy.map((strategy) => <em key={strategy}>{strategy}</em>)}</div></article>
    <section><h2>备选表达对照</h2><AlternativeComparison alternatives={report.alternatives} /></section>
    <section><h2>术语采用</h2><div className="term-usage-list">{report.term_usage.length ? report.term_usage.map((usage) => <article key={`${usage.term_id}-${usage.translation_id}`}><Link aria-label={`查看 ${termNames[usage.term_id] || `术语 ${usage.term_id}`}`} to={`/terms/${usage.term_id}`}>{termNames[usage.term_id] || `术语 #${usage.term_id}`}</Link><strong>{usage.adopted_translation}</strong><p>{usage.explanation}</p></article>) : <p>报告未声明具体术语采用。</p>}</div></section>
    <section><h2>文化风险与调适建议</h2><CulturalRiskPanel risks={report.cultural_risks} /></section>
    <section><h2>可追溯来源</h2><ReferenceList references={report.references} /></section>
    <section className="review-section"><h2>局限与复核</h2><p><b>复核优先级：</b>{report.review_priority === 'high' ? '高' : report.review_priority === 'medium' ? '中' : '低'}</p><ul>{report.limitations.map((item) => <li key={item}>{item}</li>)}</ul>{analysis.warnings.length ? <div role="status">系统校验提示：{analysis.warnings.join('、')}</div> : null}</section>
  </section>
}
