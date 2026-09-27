import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createReviewCase } from '../../services/reviewWorkspaceApi'
import type { ExpressionAnalysis } from '../../types/expressionLab'
import './save-review-case.css'

interface Props { analysis: ExpressionAnalysis; termIds: number[]; onClose: () => void }

export default function SaveReviewCaseDialog({ analysis, termIds, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<'editing' | 'saving' | 'success' | 'error'>('editing')
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ publicId: string; created: boolean } | null>(null)

  const save = async () => {
    const normalized = title.trim()
    if (!normalized) { setError('请输入案例标题'); setStatus('error'); return }
    setStatus('saving'); setError('')
    try {
      const saved = await createReviewCase({ title: normalized, term_ids: termIds, analysis })
      setResult({ publicId: saved.case.public_id, created: saved.created })
      setStatus('success')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存失败，请稍后重试')
      setStatus('error')
    }
  }

  return <div aria-labelledby="save-case-title" aria-modal="true" className="save-case-overlay" role="dialog"><section className="save-case-dialog">
    <div className="save-case-dialog__header"><div><p>RESEARCH ARCHIVE</p><h2 id="save-case-title">保存为评审案例</h2></div><button aria-label="关闭保存窗口" onClick={onClose} type="button">×</button></div>
    {status === 'success' && result ? <div className="save-case-success" role="status"><strong>{result.created ? '案例已保存。' : '该报告已经保存过。'}</strong><Link to="/lab">返回表达实验室</Link></div> : <>
      <p>AI 报告将作为不可修改的初稿保存，后续人工修改会逐版记录。</p>
      <label htmlFor="review-case-title">案例标题<input disabled={status === 'saving'} id="review-case-title" maxLength={200} onChange={(event) => setTitle(event.target.value)} value={title} /></label>
      {error ? <p role="alert">{error}</p> : null}
      <div className="save-case-dialog__actions"><button onClick={onClose} type="button">取消</button><button disabled={status === 'saving'} onClick={() => void save()} type="button">{status === 'saving' ? '正在保存…' : '确认保存'}</button></div>
    </>}
  </section></div>
}
