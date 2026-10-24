import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChildModeProvider } from '../../context/ChildModeContext'
import i18n from '../../locales'
import * as api from '../../services/knowledgeApi'
import type { TopicSummary } from '../../types/knowledge'
import TopicsPage from './TopicsPage'

vi.mock('../../services/knowledgeApi', () => ({
  listTopics: vi.fn(),
}))

const listTopics = vi.mocked(api.listTopics)
const topic: TopicSummary = {
  slug: 'huaihe-culture',
  title: '淮河文化',
  summary: '以淮河流域术语、历史人物与本草知识为线索。',
  item_count: 3,
  term_count: 1,
  entry_type_counts: { term: 1, person: 1, herb: 1 },
}

function renderTopics() {
  return render(
    <ChildModeProvider>
      <MemoryRouter>
        <TopicsPage />
      </MemoryRouter>
    </ChildModeProvider>,
  )
}

describe('TopicsPage', () => {
  beforeEach(async () => {
    localStorage.clear()
    await i18n.changeLanguage('zh')
    listTopics.mockResolvedValue([topic])
  })

  afterEach(async () => {
    vi.clearAllMocks()
    cleanup()
    await i18n.changeLanguage('zh')
  })

  it('renders published topics with research counts and canonical links', async () => {
    renderTopics()

    expect(await screen.findByRole('heading', { name: '淮河文化' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: '文化专题图志' })).toBeInTheDocument()
    expect(screen.getByText('01', { selector: '.topic-atlas-entry__number' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /进入淮河文化专题/ })).toHaveAttribute('href', '/topics/huaihe-culture')
    expect(screen.getByText('3 条内容')).toBeInTheDocument()
    expect(screen.getByText('1 个核心术语')).toBeInTheDocument()
    expect(screen.getByText('文化人物')).toBeInTheDocument()
    expect(screen.getByText('淮河本草')).toBeInTheDocument()
  })

  it('shows an explanatory empty state', async () => {
    listTopics.mockResolvedValue([])
    renderTopics()

    expect(await screen.findByText('暂时没有已发布的文化专题。')).toBeInTheDocument()
    expect(screen.getByText('专题资料完成整理与审核后会在这里呈现。')).toBeInTheDocument()
  })

  it('retries a failed topic request', async () => {
    const user = userEvent.setup()
    listTopics.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce([topic])
    renderTopics()

    await user.click(await screen.findByRole('button', { name: '重新加载专题' }))

    expect(await screen.findByRole('heading', { name: '淮河文化' })).toBeInTheDocument()
    expect(listTopics).toHaveBeenCalledTimes(2)
  })

  it('uses child-friendly guidance without changing stored summaries', async () => {
    localStorage.setItem('termbase-reading-preferences', JSON.stringify({ childMode: true }))
    renderTopics()

    expect(await screen.findByText('和孩子一起看专题')).toBeInTheDocument()
    expect(screen.getByText(topic.summary as string)).toBeInTheDocument()
  })

  it('switches interface copy to English while preserving research data', async () => {
    await i18n.changeLanguage('en')
    renderTopics()

    expect(await screen.findByRole('heading', { name: 'Cultural Topics' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open 淮河文化 topic' })).toHaveAttribute('href', '/topics/huaihe-culture')
    expect(screen.getByText('3 records')).toBeInTheDocument()
    expect(screen.getByText('1 core term')).toBeInTheDocument()
    expect(screen.getByText(topic.summary as string)).toBeInTheDocument()
  })
})
