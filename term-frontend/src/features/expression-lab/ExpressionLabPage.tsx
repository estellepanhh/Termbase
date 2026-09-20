import { useRef, useState } from 'react'
import { analyzeExpression } from '../../services/expressionLabApi'
import type { ExpressionAnalysis, ExpressionTaskInput } from '../../types/expressionLab'
import type { TermProfile } from '../../types/knowledge'
import CommunicationTaskForm, { type FormValues } from './CommunicationTaskForm'
import ExpressionReport from './ExpressionReport'
import GenerationStatus from './GenerationStatus'
import KnowledgePack from './KnowledgePack'
import TermSelector from './TermSelector'
import './expression-lab.css'

type LabState = 'editing' | 'generating' | 'success' | 'error'
const initialValues: FormValues = { sourceText: '', audience: 'overseas_youth', scenario: 'cultural_exhibition', style: 'explanatory', locale: 'general_english' }

export default function ExpressionLabPage() {
  const [selected, setSelected] = useState<TermProfile[]>([])
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<{ terms?: string; sourceText?: string }>({})
  const [state, setState] = useState<LabState>('editing')
  const [analysis, setAnalysis] = useState<ExpressionAnalysis | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const requestSequence = useRef(0)

  const submit = async () => {
    const nextErrors: typeof errors = {}
    if (!selected.length) nextErrors.terms = '请至少选择一个术语'
    const text = values.sourceText.trim()
    if (text.length < 10 || text.length > 1000) nextErrors.sourceText = '请输入10至1000字中文文本'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    const task: ExpressionTaskInput = { term_ids: selected.map((term) => term.id), source_text: text, target_language: 'en', audience: values.audience, scenario: values.scenario, style: values.style, locale: values.locale }
    const sequence = ++requestSequence.current
    setState('generating'); setErrorMessage('')
    try {
      const result = await analyzeExpression(task)
      if (sequence === requestSequence.current) { setAnalysis(result); setState('success') }
    } catch (error) {
      if (sequence === requestSequence.current) { setErrorMessage(error instanceof Error ? error.message : '分析失败，请稍后重试'); setState('error') }
    }
  }

  const termNames = Object.fromEntries(selected.map((term) => [term.id, term.preferred_name_zh]))
  const cancelWaiting = () => {
    requestSequence.current += 1
    setState('editing')
  }
  return <div className="expression-lab-page">
    <header className="lab-hero"><div><p className="lab-eyebrow">CROSS-CULTURAL EXPRESSION LAB</p><h1>跨文化表达实验室</h1><p>把术语知识、受众场景与文化风险组织成一份可比较、可追溯、可复核的英语表达方案。</p></div><aside><strong>研究型生成</strong><span>术语依据 → 场景适配 → 引用校验</span></aside></header>
    <div className="lab-workspace"><div className="lab-input-column">
      <TermSelector selected={selected} onAdd={(term) => { setSelected((items) => items.length >= 5 || items.some((item) => item.id === term.id) ? items : [...items, term]); setErrors((current) => ({ ...current, terms: undefined })) }} onRemove={(id) => setSelected((items) => items.filter((term) => term.id !== id))} />
      <section className="lab-panel"><div className="lab-section-heading lab-section-heading--small"><span>依据</span><div><p>SELECTED KNOWLEDGE</p><h2>当前知识包</h2></div></div><KnowledgePack terms={selected} /></section>
      <CommunicationTaskForm errors={errors} loading={state === 'generating'} onChange={setValues} onSubmit={() => void submit()} values={values} />
    </div><aside className="lab-output-column">
      {state === 'editing' ? <section className="lab-output-empty"><span>03</span><h2>等待生成</h2><p>完成术语选择和传播任务后，这里将呈现首选表达、备选对照、文化风险和可追溯来源。</p></section> : null}
      {state === 'generating' ? <GenerationStatus onCancel={cancelWaiting} /> : null}
      {state === 'error' ? <section className="lab-error" role="alert"><h2>本次分析未完成</h2><p>{errorMessage}</p><button onClick={() => void submit()} type="button">按原任务重试</button></section> : null}
      {state === 'success' && analysis ? <><div className="knowledge-summary"><b>本次知识依据</b><span>{analysis.knowledge_summary.term_count} 个术语 · {analysis.knowledge_summary.translation_count} 个译法 · {analysis.knowledge_summary.source_count} 个来源</span></div><ExpressionReport analysis={analysis} termIds={selected.map((term) => term.id)} termNames={termNames} /></> : null}
    </aside></div>
  </div>
}
