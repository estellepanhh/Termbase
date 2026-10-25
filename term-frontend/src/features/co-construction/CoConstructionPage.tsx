import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import {
  createSubmission,
  listMySubmissions,
  withdrawSubmission,
  type TermSubmission,
  type TermSubmissionInput,
} from '../../services/coConstructionApi'
import './co-construction.css'

const initialForm: TermSubmissionInput = {
  preferred_name_zh: '',
  definition_zh: '',
  recommended_translation: '',
  cultural_connotation: '',
  source_text: '',
}

const statusText: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  withdrawn: '已撤回',
}

export default function CoConstructionPage() {
  const auth = useAuth()
  const location = useLocation()
  const [form, setForm] = useState<TermSubmissionInput>(initialForm)
  const [items, setItems] = useState<TermSubmission[]>([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (auth.status !== 'authenticated') return
    void listMySubmissions().then(setItems).catch(() => setItems([]))
  }, [auth.status])

  if (auth.status !== 'authenticated') {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  const setField = (field: keyof TermSubmissionInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setStatus('')
    try {
      const created = await createSubmission(form)
      setItems((current) => [created, ...current])
      setForm(initialForm)
      setStatus('已提交，等待管理员审核。')
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : '提交失败')
    } finally {
      setLoading(false)
    }
  }

  const withdraw = async (publicId: string) => {
    const next = await withdrawSubmission(publicId)
    setItems((current) => current.map((item) => item.public_id === publicId ? next : item))
  }

  return (
    <section className="co-construction-page" aria-labelledby="co-construction-title">
      <header className="co-construction-hero">
        <p>TERM CO-CONSTRUCTION</p>
        <h1 id="co-construction-title">术语共建</h1>
        <span>提交新的中国特色话语术语资料，由管理员审核后进入正式术语库。</span>
      </header>

      <nav aria-label="术语共建流程" className="co-construction-process">
        <ol>
          <li><span>01</span><strong>提交资料</strong><small>补充术语、译法与来源依据</small></li>
          <li><span>02</span><strong>专业审核</strong><small>核对定义、语境与表达规范</small></li>
          <li><span>03</span><strong>进入术语库</strong><small>审核通过后形成公开术语档案</small></li>
        </ol>
      </nav>

      <div className="co-construction-layout">
        <form className="co-construction-form" onSubmit={(event) => void submit(event)}>
          <h2>提交共建术语</h2>
          <label>术语名称<input required value={form.preferred_name_zh} onChange={(event) => setField('preferred_name_zh', event.target.value)} /></label>
          <label>定义说明<textarea required value={form.definition_zh} onChange={(event) => setField('definition_zh', event.target.value)} /></label>
          <label>推荐译法<input value={form.recommended_translation} onChange={(event) => setField('recommended_translation', event.target.value)} /></label>
          <label>文化说明<textarea value={form.cultural_connotation} onChange={(event) => setField('cultural_connotation', event.target.value)} /></label>
          <label>来源依据<textarea value={form.source_text} onChange={(event) => setField('source_text', event.target.value)} /></label>
          {status ? <p role="status">{status}</p> : null}
          <button disabled={loading} type="submit">{loading ? '提交中…' : '提交审核'}</button>
        </form>

        <section className="co-construction-list" aria-labelledby="my-submissions-title">
          <h2 id="my-submissions-title">我的共建记录</h2>
          {items.length ? items.map((item) => (
            <article key={item.public_id}>
              <div>
                <strong>{item.preferred_name_zh}</strong>
                <span>{statusText[item.status] || item.status}</span>
              </div>
              <p>{item.definition_zh}</p>
              {item.review_note ? <small>审核意见：{item.review_note}</small> : null}
              {item.status === 'pending' ? <button onClick={() => void withdraw(item.public_id)} type="button">撤回</button> : null}
            </article>
          )) : <p>还没有共建记录。</p>}
        </section>
      </div>
    </section>
  )
}
