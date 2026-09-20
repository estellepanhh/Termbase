import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PaginatedTerms } from '../../types/knowledge'
import * as api from '../../services/knowledgeApi'
import AppRoutes from '../../app/routes'
import i18n from '../../locales'
import DiscoveryPage from './DiscoveryPage'
import { ChildModeProvider } from '../../context/ChildModeContext'

vi.mock('../../services/knowledgeApi', () => ({
  listTerms: vi.fn(),
}))

const listTerms = vi.mocked(api.listTerms)

const response: PaginatedTerms = {
  data: [{
    id: 1,
    preferred_name_zh: '和而不同',
    definition_zh: '承认差异并追求和谐共处。',
    child_explanation: '大家可以不一样，也可以友好相处。',
    term_level: '本源层',
    culture_category: '中华优秀传统文化',
    data_quality: 'legacy_unreviewed',
    recommended_translation: {
      language_code: 'en',
      language_name_zh: '英语',
      text: 'harmony in diversity',
      translation_type: 'recommended',
      authority_level: 'research',
      review_status: 'pending',
    },
    language_count: 2,
    source_count: 2,
  }],
  meta: { page: 1, page_size: 20, total: 42 },
}

function LocationProbe() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <>
      <output data-testid="discovery-location">{`${location.pathname}${location.search}`}</output>
      <button onClick={() => navigate(-1)} type="button">浏览器后退</button>
      <button onClick={() => navigate(1)} type="button">浏览器前进</button>
    </>
  )
}

function renderDiscovery(initialEntry = '/discover') {
  return render(
    <ChildModeProvider><MemoryRouter initialEntries={[initialEntry]}>
      <DiscoveryPage />
      <LocationProbe />
    </MemoryRouter></ChildModeProvider>,
  )
}

describe('DiscoveryPage', () => {
  beforeEach(async () => {
    localStorage.clear()
    await i18n.changeLanguage('zh')
    listTerms.mockResolvedValue(response)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('loads filters from the URL and renders semantic result links', async () => {
    renderDiscovery('/discover?q=和而&level=本源层')

    await waitFor(() => expect(listTerms).toHaveBeenCalledWith({
      q: '和而', level: '本源层', page: 1, pageSize: 20,
    }))

    expect(await screen.findByRole('link', { name: '和而不同' })).toHaveAttribute('href', '/terms/1')
    expect(screen.getByText('2 个来源')).toBeInTheDocument()
    expect(screen.getByText('2 种语言')).toBeInTheDocument()
    expect(screen.getByText('历史数据待复核')).toBeInTheDocument()
    expect(screen.queryByText('权威审定')).not.toBeInTheDocument()
  })

  it('uses the child explanation in child mode without losing the term link', async () => {
    localStorage.setItem('termbase-reading-preferences', JSON.stringify({ childMode: true, largeTextMode: false }))
    renderDiscovery()
    expect(await screen.findByText('大家可以不一样，也可以友好相处。')).toBeInTheDocument()
    expect(screen.queryByText('承认差异并追求和谐共处。')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '和而不同' })).toHaveAttribute('href', '/terms/1')
  })

  it('canonicalizes malformed and non-positive URL pages to page one', async () => {
    for (const page of ['0', '-2', 'not-a-number', '1.5']) {
      listTerms.mockClear()
      const rendered = renderDiscovery(`/discover?q=%E5%92%8C&page=${page}`)
      await waitFor(() => expect(listTerms).toHaveBeenCalledWith({ q: '和', page: 1, pageSize: 20 }))
      rendered.unmount()
      cleanup()
    }
  })

  it('writes submitted searches, filters, and page changes back to the URL', async () => {
    const user = userEvent.setup()
    renderDiscovery()

    await screen.findByRole('link', { name: '和而不同' })
    await user.type(screen.getByRole('searchbox', { name: '搜索术语' }), '共同体')
    await user.click(screen.getByRole('button', { name: '搜索' }))

    expect(screen.getByTestId('discovery-location')).toHaveTextContent('/discover?q=%E5%85%B1%E5%90%8C%E4%BD%93')

    await user.selectOptions(screen.getByRole('combobox', { name: '术语层级' }), '核心层')
    expect(screen.getByTestId('discovery-location')).toHaveTextContent('q=%E5%85%B1%E5%90%8C%E4%BD%93&level=%E6%A0%B8%E5%BF%83%E5%B1%82')

    await user.selectOptions(screen.getByRole('combobox', { name: '语种' }), 'en')
    expect(screen.getByTestId('discovery-location')).toHaveTextContent('language=en')

    await user.click(screen.getByRole('button', { name: '第 2 页' }))
    expect(screen.getByTestId('discovery-location')).toHaveTextContent('page=2')
    await waitFor(() => expect(listTerms).toHaveBeenLastCalledWith({
      q: '共同体', level: '核心层', language: 'en', page: 2, pageSize: 20,
    }))
  })

  it('keeps prior results visible while a URL page change is loading', async () => {
    let resolveNext: ((value: PaginatedTerms) => void) | undefined
    listTerms.mockResolvedValueOnce(response).mockImplementationOnce(() => new Promise((resolve) => {
      resolveNext = resolve
    }))
    const user = userEvent.setup()
    renderDiscovery()

    await screen.findByRole('link', { name: '和而不同' })
    await user.click(screen.getByRole('button', { name: '第 2 页' }))

    expect(screen.getByRole('link', { name: '和而不同' })).toBeInTheDocument()
    expect(screen.getByText('正在更新结果…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '第 2 页' })).toHaveAttribute('aria-current', 'page')

    resolveNext?.({ ...response, meta: { ...response.meta, total: 1 } })
    await waitFor(() => expect(screen.queryByText('正在更新结果…')).not.toBeInTheDocument())
  })

  it('offers useful empty and retry states without removing filters', async () => {
    listTerms.mockResolvedValueOnce({ data: [], meta: { page: 1, page_size: 20, total: 0 } })
    const user = userEvent.setup()
    renderDiscovery('/discover?q=不存在&level=本源层')

    expect(await screen.findByText('未找到符合条件的术语。可尝试调整关键词或筛选条件。')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '术语层级' })).toHaveValue('本源层')

    listTerms.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(response)
    await user.selectOptions(screen.getByRole('combobox', { name: '术语层级' }), '核心层')
    await user.click(await screen.findByRole('button', { name: '重试加载术语' }))

    expect(await screen.findByRole('link', { name: '和而不同' })).toBeInTheDocument()
  })

  it('replaces an out-of-range URL page with the last valid page while preserving filters', async () => {
    listTerms
      .mockResolvedValueOnce({ ...response, data: [], meta: { page: 99, page_size: 20, total: 42 } })
      .mockResolvedValueOnce({ ...response, meta: { page: 3, page_size: 20, total: 42 } })
    renderDiscovery('/discover?q=%E5%92%8C&level=%E6%9C%AC%E6%BA%90%E5%B1%82&language=en&page=99')

    await waitFor(() => expect(screen.getByTestId('discovery-location')).toHaveTextContent(
      '/discover?q=%E5%92%8C&level=%E6%9C%AC%E6%BA%90%E5%B1%82&language=en&page=3',
    ))
    await waitFor(() => expect(listTerms).toHaveBeenLastCalledWith({
      q: '和', level: '本源层', language: 'en', page: 3, pageSize: 20,
    }))
    expect(await screen.findByRole('button', { name: '第 3 页' })).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByText('未找到符合条件的术语。可尝试调整关键词或筛选条件。')).not.toBeInTheDocument()
  })

  it('normalizes an invalid page to page one for an empty collection without looping', async () => {
    const empty = { data: [], meta: { page: 9, page_size: 20, total: 0 } }
    listTerms.mockResolvedValueOnce(empty).mockResolvedValueOnce({ ...empty, meta: { ...empty.meta, page: 1 } })
    renderDiscovery('/discover?q=%E4%B8%8D%E5%AD%98%E5%9C%A8&page=9')

    await waitFor(() => expect(screen.getByTestId('discovery-location')).toHaveTextContent('/discover?q=%E4%B8%8D%E5%AD%98%E5%9C%A8&page=1'))
    await waitFor(() => expect(listTerms).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('未找到符合条件的术语。可尝试调整关键词或筛选条件。')).toBeInTheDocument()
  })

  it('ignores a stale response after a newer URL search succeeds', async () => {
    let resolveFirst: ((value: PaginatedTerms) => void) | undefined
    let resolveSecond: ((value: PaginatedTerms) => void) | undefined
    listTerms
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve }))
    const user = userEvent.setup()
    renderDiscovery('/discover?q=%E6%97%A7%E6%9F%A5%E8%AF%A2')

    await waitFor(() => expect(listTerms).toHaveBeenCalledTimes(1))
    const search = screen.getByRole('searchbox', { name: '搜索术语' })
    await user.clear(search)
    await user.type(search, '新查询')
    await user.click(screen.getByRole('button', { name: '搜索' }))
    await waitFor(() => expect(listTerms).toHaveBeenCalledTimes(2))

    resolveSecond?.({ ...response, data: [{ ...response.data[0], id: 2, preferred_name_zh: '新结果' }] })
    expect(await screen.findByRole('link', { name: '新结果' })).toBeInTheDocument()
    resolveFirst?.(response)

    await waitFor(() => expect(screen.queryByRole('link', { name: '和而不同' })).not.toBeInTheDocument())
  })

  it('rehydrates controls and requests from browser back and forward navigation', async () => {
    const user = userEvent.setup()
    renderDiscovery('/discover?q=%E6%97%A7%E6%9F%A5%E8%AF%A2')

    const search = await screen.findByRole('searchbox', { name: '搜索术语' })
    expect(search).toHaveValue('旧查询')
    await user.clear(search)
    await user.type(search, '新查询')
    await user.click(screen.getByRole('button', { name: '搜索' }))
    await waitFor(() => expect(screen.getByTestId('discovery-location')).toHaveTextContent('q=%E6%96%B0%E6%9F%A5%E8%AF%A2'))

    await user.click(screen.getByRole('button', { name: '浏览器后退' }))
    await waitFor(() => expect(screen.getByRole('searchbox', { name: '搜索术语' })).toHaveValue('旧查询'))
    await waitFor(() => expect(listTerms).toHaveBeenLastCalledWith({ q: '旧查询', page: 1, pageSize: 20 }))

    await user.click(screen.getByRole('button', { name: '浏览器前进' }))
    await waitFor(() => expect(screen.getByRole('searchbox', { name: '搜索术语' })).toHaveValue('新查询'))
    await waitFor(() => expect(listTerms).toHaveBeenLastCalledWith({ q: '新查询', page: 1, pageSize: 20 }))
  })

  it('disables pagination controls at the URL-derived bounds', async () => {
    const user = userEvent.setup()
    renderDiscovery()

    await screen.findByRole('link', { name: '和而不同' })
    expect(screen.getByRole('button', { name: '上一页' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '第 3 页' }))
    expect(screen.getByRole('button', { name: '下一页' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '第 3 页' })).toHaveAttribute('aria-current', 'page')
  })

  it('mounts discovery through the real application route', async () => {
    render(
      <MemoryRouter initialEntries={['/discover?q=%E5%92%8C']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: '术语探索' })).toBeInTheDocument()
    await waitFor(() => expect(listTerms).toHaveBeenCalledWith({ q: '和', page: 1, pageSize: 20 }))
    expect(await screen.findByRole('link', { name: '和而不同' })).toHaveAttribute('href', '/terms/1')
  })
})
