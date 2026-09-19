import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { listTerms } from '../../services/knowledgeApi'
import type { PaginatedTerms, TermQuery } from '../../types/knowledge'
import DiscoveryFilters, { type DiscoveryFilterValues } from './DiscoveryFilters'
import TermResultItem from './TermResultItem'
import './discovery.css'

const PAGE_SIZE = 20

function pageFromUrl(value: string | null) {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

function queryFromUrl(search: string): TermQuery {
  const params = new URLSearchParams(search)
  const optionalParam = (name: 'q' | 'level' | 'culture' | 'language') => params.get(name) || undefined

  return {
    q: optionalParam('q'),
    level: optionalParam('level'),
    culture: optionalParam('culture'),
    language: optionalParam('language'),
    page: pageFromUrl(params.get('page')),
    pageSize: PAGE_SIZE,
  }
}

function filterValuesFromUrl(search: string): DiscoveryFilterValues {
  const params = new URLSearchParams(search)
  return {
    q: params.get('q') || '',
    level: params.get('level') || '',
    culture: params.get('culture') || '',
    language: params.get('language') || '',
  }
}

function pageNumbers(currentPage: number, totalPages: number) {
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4))
  const end = Math.min(totalPages, start + 4)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function maximumPage(response: PaginatedTerms) {
  return Math.max(1, Math.ceil(response.meta.total / response.meta.page_size))
}

export default function DiscoveryPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const query = useMemo(() => queryFromUrl(location.search), [location.search])
  const filters = useMemo(() => filterValuesFromUrl(location.search), [location.search])
  const [response, setResponse] = useState<PaginatedTerms | null>(null)
  const [status, setStatus] = useState<'loading' | 'refreshing' | 'ready' | 'error'>('loading')
  const [retryKey, setRetryKey] = useState(0)
  const hasResults = useRef(false)

  useEffect(() => {
    let active = true
    setStatus(hasResults.current ? 'refreshing' : 'loading')

    void listTerms(query)
      .then((nextResponse) => {
        if (active) {
          const maxPage = maximumPage(nextResponse)
          if ((query.page ?? 1) > maxPage) {
            const params = new URLSearchParams(location.search)
            params.set('page', String(maxPage))
            navigate(`/discover?${params.toString()}`, { replace: true })
            return
          }
          hasResults.current = true
          setResponse(nextResponse)
          setStatus('ready')
        }
      })
      .catch(() => {
        if (active) {
          setStatus('error')
        }
      })

    return () => {
      active = false
    }
  }, [location.search, navigate, query, retryKey])

  const updateUrl = (updates: Record<string, string | undefined>, resetPage = true) => {
    const params = new URLSearchParams(location.search)
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    if (resetPage) {
      params.delete('page')
    }
    const nextSearch = params.toString()
    navigate(nextSearch ? `/discover?${nextSearch}` : '/discover')
  }

  const totalPages = response ? maximumPage(response) : 1
  const currentPage = query.page ?? response?.meta.page ?? 1

  return (
    <div className="discovery-page">
      <div className="discovery-page__header">
        <p className="discovery-page__eyebrow">TERMINOLOGY RESEARCH</p>
        <h1>术语探索</h1>
        <p>从术语名称、概念层级、文化分类与语种线索进入可追溯的知识档案。</p>
      </div>

      <DiscoveryFilters
        key={filters.q}
        onFilterChange={(filter, value) => updateUrl({ [filter]: value })}
        onSearch={(value) => updateUrl({ q: value })}
        values={filters}
      />

      <section aria-labelledby="discovery-results-title" className="discovery-results">
        <div className="discovery-results__header">
          <div>
            <p className="discovery-page__eyebrow">SEARCH RESULTS</p>
            <h2 id="discovery-results-title">术语结果</h2>
          </div>
          {response ? <p>{response.meta.total} 条结果</p> : null}
        </div>

        <div aria-busy={status === 'loading' || status === 'refreshing'} aria-live="polite" className="discovery-results__body">
          {status === 'loading' && !response ? <p className="discovery-status">正在加载术语…</p> : null}
          {status === 'refreshing' ? <p className="discovery-status discovery-status--inline">正在更新结果…</p> : null}
          {status === 'error' ? (
            <div className="discovery-status" role="alert">
              <p>术语暂时无法加载，请检查网络后重试。</p>
              <button onClick={() => setRetryKey((key) => key + 1)} type="button">重试加载术语</button>
            </div>
          ) : null}
          {status !== 'error' && response?.data.length === 0 ? (
            <p className="discovery-status">未找到符合条件的术语。可尝试调整关键词或筛选条件。</p>
          ) : null}
          {response?.data.length ? (
            <div className="discovery-result-list">
              {response.data.map((term) => <TermResultItem key={term.id} term={term} />)}
            </div>
          ) : null}
        </div>

        {response && response.meta.total > response.meta.page_size ? (
          <nav aria-label="术语结果分页" className="discovery-pagination">
            <button disabled={currentPage <= 1} onClick={() => updateUrl({ page: String(currentPage - 1) }, false)} type="button">上一页</button>
            {pageNumbers(currentPage, totalPages).map((page) => (
              <button
                aria-current={page === currentPage ? 'page' : undefined}
                aria-label={`第 ${page} 页`}
                disabled={page === currentPage}
                key={page}
                onClick={() => updateUrl({ page: String(page) }, false)}
                type="button"
              >
                {page}
              </button>
            ))}
            <button disabled={currentPage >= totalPages} onClick={() => updateUrl({ page: String(currentPage + 1) }, false)} type="button">下一页</button>
          </nav>
        ) : null}
      </section>
    </div>
  )
}
