import { useState } from 'react'
import { getTerm, listTerms } from '../../services/knowledgeApi'
import type { TermProfile, TermSummary } from '../../types/knowledge'

interface Props {
  selected: TermProfile[]
  onAdd: (term: TermProfile) => void
  onRemove: (id: number) => void
}

export default function TermSelector({ selected, onAdd, onRemove }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TermSummary[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  const search = async () => {
    setStatus('loading')
    try {
      const response = await listTerms({ q: query.trim() || undefined, language: 'en', page: 1, pageSize: 8 })
      setResults(response.data)
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }

  const add = async (term: TermSummary) => {
    if (selected.some((item) => item.id === term.id) || selected.length >= 5) return
    try {
      onAdd(await getTerm(term.id))
    } catch {
      setStatus('error')
    }
  }

  return (
    <section aria-labelledby="term-selector-title" className="lab-panel term-selector">
      <div className="lab-section-heading">
        <span>01</span><div><p>KNOWLEDGE GROUNDING</p><h2 id="term-selector-title">选择术语依据</h2></div>
      </div>
      <p className="lab-muted">从已发布档案中选择 1—5 个术语，生成内容将只使用这些知识依据。</p>
      <form className="term-search" onSubmit={(event) => { event.preventDefault(); void search() }}>
        <label htmlFor="term-search-input">搜索已发布术语</label>
        <div><input id="term-search-input" onChange={(event) => setQuery(event.target.value)} type="search" value={query} /><button type="submit">搜索术语</button></div>
      </form>
      {status === 'loading' ? <p aria-live="polite">正在检索术语…</p> : null}
      {status === 'error' ? <p role="alert">术语加载失败，请重试。</p> : null}
      <div className="term-search-results">
        {results.map((term) => {
          const added = selected.some((item) => item.id === term.id)
          return <article key={term.id}><div><strong>{term.preferred_name_zh}</strong><p>{term.definition_zh}</p></div><button aria-label={`添加 ${term.preferred_name_zh}`} disabled={added || selected.length >= 5} onClick={() => void add(term)} type="button">{added ? '已选择' : '添加'}</button></article>
        })}
      </div>
      {selected.length ? <div className="selected-term-chips" aria-label="已选术语">{selected.map((term) => <button key={term.id} onClick={() => onRemove(term.id)} type="button">{term.preferred_name_zh}<span aria-hidden="true"> ×</span></button>)}</div> : null}
    </section>
  )
}
