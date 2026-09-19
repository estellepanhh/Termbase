import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../locales'
import type { PaginatedTerms, TermSummary } from '../../types/knowledge'
import * as api from '../../services/knowledgeApi'
import HomePage from './HomePage'

vi.mock('../../services/knowledgeApi', () => ({
  listTerms: vi.fn(),
}))

const listTerms = vi.mocked(api.listTerms)

const term: TermSummary = {
  id: 7,
  preferred_name_zh: '和而不同',
  definition_zh: '承认差异并追求和谐共处。',
  term_level: '本源层',
  culture_category: '中华优秀传统文化',
  data_quality: 'reviewed',
  recommended_translation: {
    language_code: 'en',
    language_name_zh: '英语',
    text: 'harmony in diversity',
    translation_type: 'recommended',
    authority_level: 'official',
    review_status: 'approved',
  },
  language_count: 2,
  source_count: 1,
}

const response: PaginatedTerms = {
  data: [term],
  meta: { page: 1, page_size: 6, total: 12 },
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="home-search-location">{`${location.pathname}${location.search}`}</output>
}

function renderHome(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <HomePage />
      <LocationProbe />
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh')
    listTerms.mockResolvedValue(response)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('explains the research platform before presenting content', async () => {
    renderHome()

    expect(screen.getByRole('heading', { name: '让中国特色概念被准确理解与表达' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: '搜索术语' })).toBeInTheDocument()
    expect(screen.getByText('核心层')).toBeInTheDocument()
    expect(screen.getByText('拓展层')).toBeInTheDocument()
    expect(screen.getByText('本源层')).toBeInTheDocument()
  })

  it('sends a submitted research query to the canonical discovery URL', async () => {
    const user = userEvent.setup()
    renderHome()

    await user.type(screen.getByRole('searchbox', { name: '搜索术语' }), '和而不同')
    await user.click(screen.getByRole('button', { name: '开始检索' }))

    expect(screen.getByTestId('home-search-location')).toHaveTextContent('/discover?q=%E5%92%8C%E8%80%8C%E4%B8%8D%E5%90%8C')
  })

  it('links featured terms to their canonical profiles and reports the proven total', async () => {
    renderHome()

    expect(await screen.findByRole('link', { name: '和而不同' })).toHaveAttribute('href', '/terms/7')
    expect(screen.getByText('已收录 12 条术语')).toBeInTheDocument()
    expect(listTerms).toHaveBeenCalledWith({ page: 1, pageSize: 6 })
  })

  it('shows an empty featured state without hiding the rest of the research entry points', async () => {
    listTerms.mockResolvedValue({ data: [], meta: { page: 1, page_size: 6, total: 0 } })
    renderHome()

    expect(await screen.findByText('精选术语将在资料整理完成后呈现。')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '进入表达实验室' })).toHaveAttribute('href', '/lab')
    expect(screen.getByRole('link', { name: '查看淮河文化专题' })).toHaveAttribute('href', '/topics')
  })

  it('allows a failed featured request to be retried without hiding the page', async () => {
    const user = userEvent.setup()
    listTerms.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(response)
    renderHome()

    await user.click(await screen.findByRole('button', { name: '重试加载精选术语' }))

    expect(await screen.findByRole('link', { name: '和而不同' })).toBeInTheDocument()
    await waitFor(() => expect(listTerms).toHaveBeenCalledTimes(2))
    expect(screen.getByRole('heading', { name: '让中国特色概念被准确理解与表达' })).toBeInTheDocument()
  })

  it('does not invent a knowledge-progress total while the term response is unavailable', async () => {
    listTerms.mockRejectedValue(new Error('network'))
    renderHome()

    await screen.findByRole('button', { name: '重试加载精选术语' })

    expect(screen.queryByText('已收录 0 条术语')).not.toBeInTheDocument()
  })
})
