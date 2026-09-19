import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PaginatedTerms } from '../../types/knowledge'
import * as api from '../../services/knowledgeApi'
import DiscoveryPage from './DiscoveryPage'

vi.mock('../../services/knowledgeApi', () => ({
  listTerms: vi.fn(),
}))

const listTerms = vi.mocked(api.listTerms)

const response: PaginatedTerms = {
  data: [{
    id: 1,
    preferred_name_zh: '和而不同',
    definition_zh: '承认差异并追求和谐共处。',
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
  return <output data-testid="discovery-location">{`${location.pathname}${location.search}`}</output>
}

function renderDiscovery(initialEntry = '/discover') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <DiscoveryPage />
      <LocationProbe />
    </MemoryRouter>,
  )
}

describe('DiscoveryPage', () => {
  beforeEach(() => {
    listTerms.mockResolvedValue(response)
  })

  afterEach(() => {
    vi.clearAllMocks()
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

  it('writes submitted searches, filters, and page changes back to the URL', async () => {
    const user = userEvent.setup()
    renderDiscovery()

    await screen.findByRole('link', { name: '和而不同' })
    await user.type(screen.getByRole('searchbox', { name: '搜索术语' }), '共同体')
    await user.click(screen.getByRole('button', { name: '搜索' }))

    expect(screen.getByTestId('discovery-location')).toHaveTextContent('/discover?q=%E5%85%B1%E5%90%8C%E4%BD%93')

    await user.selectOptions(screen.getByRole('combobox', { name: '术语层级' }), '核心层')
    expect(screen.getByTestId('discovery-location')).toHaveTextContent('q=%E5%85%B1%E5%90%8C%E4%BD%93&level=%E6%A0%B8%E5%BF%83%E5%B1%82')

    await user.click(screen.getByRole('button', { name: '第 2 页' }))
    expect(screen.getByTestId('discovery-location')).toHaveTextContent('page=2')
    await waitFor(() => expect(listTerms).toHaveBeenLastCalledWith({
      q: '共同体', level: '核心层', page: 2, pageSize: 20,
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
})
