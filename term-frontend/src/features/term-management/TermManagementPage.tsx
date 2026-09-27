import { useEffect, useState } from 'react'
import { createAdminTerm, deleteAdminTerm, listAdminTerms, updateAdminTerm } from '../../services/knowledgeApi'
import type { AdminTerm, AdminTermInput } from '../../types/knowledge'
import './term-management.css'

const emptyForm: AdminTermInput = { preferred_name_zh: '', definition_zh: '', cultural_connotation: '', term_level: '', culture_category: '', status: 'draft' }

function errorMessage(error: unknown) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '操作没有完成，请稍后重试。'
}

export default function TermManagementPage() {
  const [terms, setTerms] = useState<AdminTerm[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState<AdminTerm | null | 'new'>(null)
  const [form, setForm] = useState<AdminTermInput>(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async (q = query) => {
    setStatus('loading')
    try { const result = await listAdminTerms({ q: q || undefined }); setTerms(result.data); setStatus('ready') }
    catch { setStatus('error') }
  }

  useEffect(() => {
    let active = true
    void listAdminTerms().then((result) => {
      if (active) { setTerms(result.data); setStatus('ready') }
    }).catch(() => { if (active) setStatus('error') })
    return () => { active = false }
  }, [])

  const openNew = () => { setForm(emptyForm); setEditing('new'); setMessage('') }
  const openEdit = (term: AdminTerm) => { setForm({ preferred_name_zh: term.preferred_name_zh, definition_zh: term.definition_zh, cultural_connotation: term.cultural_connotation, term_level: term.term_level, culture_category: term.culture_category, status: term.status }); setEditing(term); setMessage('') }
  const update = (field: keyof AdminTermInput, value: string) => setForm((current) => ({ ...current, [field]: value }))

  const save = async () => {
    if (!form.preferred_name_zh.trim()) { setMessage('请填写中文术语名。'); return }
    setSaving(true)
    try {
      if (editing === 'new') await createAdminTerm(form)
      else if (editing) await updateAdminTerm(editing.id, form)
      setEditing(null); setMessage('术语已保存。'); await load()
    } catch (error) { setMessage(errorMessage(error)) }
    finally { setSaving(false) }
  }

  const remove = async (term: AdminTerm) => {
    if (!window.confirm(`确定删除“${term.preferred_name_zh}”吗？此操作不可撤销。`)) return
    try { await deleteAdminTerm(term.id); setMessage('术语已删除。'); await load() }
    catch (error) { setMessage(errorMessage(error)) }
  }

  return (
    <div className="term-management">
      <header className="term-management__hero"><div><p>TERMINOLOGY OPERATIONS</p><h1>术语管理台</h1><span>将采集、修订和发布状态集中管理，形成可追溯的术语生产入口。</span></div><aside><strong>演示管理端</strong><p>公网部署前需接入账号与权限控制。</p></aside></header>
      <section className="term-management__toolbar" aria-label="术语管理操作">
        <form onSubmit={(event) => { event.preventDefault(); void load(query) }}><label htmlFor="manage-search">检索管理库</label><div><input id="manage-search" onChange={(event) => setQuery(event.target.value)} placeholder="输入术语名称或定义" value={query} /><button type="submit">搜索</button></div></form>
        <button aria-label="新增术语" className="term-management__add" onClick={openNew} type="button">＋ 新增术语</button>
      </section>
      {message ? <p className="term-management__message" role="status">{message}</p> : null}
      {status === 'loading' ? <p className="term-management__state">正在读取术语库…</p> : null}
      {status === 'error' ? <div className="term-management__state" role="alert">术语管理库暂时无法连接。<button onClick={() => void load()} type="button">重试</button></div> : null}
      {status === 'ready' ? <section className="term-management__list" aria-label="术语管理列表">
        {terms.map((term) => <article aria-label={`术语：${term.preferred_name_zh}`} className="term-management__item" key={term.id}>
          <div className="term-management__status"><span>{term.status === 'published' ? '已发布' : '草稿'}</span><small>#{String(term.id).padStart(4, '0')}</small></div>
          <div><h2>{term.preferred_name_zh}</h2><p>{term.definition_zh || '尚未填写定义'}</p><div className="term-management__tags">{term.term_level ? <span>{term.term_level}</span> : null}{term.culture_category ? <span>{term.culture_category}</span> : null}</div></div>
          <div className="term-management__actions"><button aria-label={`编辑${term.preferred_name_zh}`} onClick={() => openEdit(term)} type="button">编辑</button><button aria-label={`删除${term.preferred_name_zh}`} onClick={() => void remove(term)} type="button">删除</button></div>
        </article>)}
        {!terms.length ? <p className="term-management__state">没有找到符合条件的术语。</p> : null}
      </section> : null}
      {editing ? <div className="term-editor" role="presentation"><section aria-label={editing === 'new' ? '新增术语' : `编辑术语：${editing.preferred_name_zh}`} aria-modal="true" className="term-editor__dialog" role="dialog">
        <header><div><p>TERM RECORD</p><h2>{editing === 'new' ? '新增术语' : '编辑术语'}</h2></div><button aria-label="关闭术语编辑器" onClick={() => setEditing(null)} type="button">×</button></header>
        <div className="term-editor__fields"><label>中文术语名<input aria-label="中文术语名" onChange={(e) => update('preferred_name_zh', e.target.value)} value={form.preferred_name_zh} /></label><label>中文定义<textarea aria-label="中文定义" onChange={(e) => update('definition_zh', e.target.value)} value={form.definition_zh} /></label><label>文化内涵<textarea onChange={(e) => update('cultural_connotation', e.target.value)} value={form.cultural_connotation} /></label><div><label>术语层级<input onChange={(e) => update('term_level', e.target.value)} value={form.term_level} /></label><label>文化分类<input onChange={(e) => update('culture_category', e.target.value)} value={form.culture_category} /></label></div><label>发布状态<select onChange={(e) => update('status', e.target.value)} value={form.status}><option value="draft">草稿</option><option value="published">已发布</option></select></label></div>
        {message ? <p className="term-editor__message">{message}</p> : null}<footer><button onClick={() => setEditing(null)} type="button">取消</button><button disabled={saving} onClick={() => void save()} type="button">{saving ? '保存中…' : '保存术语'}</button></footer>
      </section></div> : null}
    </div>
  )
}
