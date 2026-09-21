import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChildModeProvider } from '../../context/ChildModeContext'
import * as api from '../../services/knowledgeApi'
import type { PublicTopicDetail } from '../../types/knowledge'
import TopicDetailPage from './TopicDetailPage'

vi.mock('../../services/knowledgeApi', () => ({
  getTopic: vi.fn(),
}))

const getTopic = vi.mocked(api.getTopic)
const topic: PublicTopicDetail = {
  slug: 'huaihe-culture',
  title: '淮河文化',
  summary: '以淮河流域术语、历史人物与本草知识为线索。',
  item_count: 3,
  term_count: 1,
  entry_type_counts: { term: 1, person: 1, herb: 1 },
  items: [
    {
      id: 1,
      entry_type: 'term',
      title: '淮河文化',
      fields: {},
      term: {
        id: 8,
        preferred_name_zh: '淮河文化',
        definition_zh: '淮河流域形成的地域文化传统。',
        term_level: '地域层',
        culture_category: '地方文化',
        recommended_translation: 'Huaihe culture',
      },
    },
    {
      id: 2,
      entry_type: 'person',
      title: '管仲',
      term: null,
      fields: { 分类: '人物', 百度链接: 'https://example.test/person' },
    },
    {
      id: 3,
      entry_type: 'herb',
      title: '金银花',
      term: null,
      fields: { '官方译法（英文）': 'honeysuckle' },
    },
  ],
}

function renderTopic(initialEntry = '/topics/huaihe-culture') {
  return render(
    <ChildModeProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/topics/:slug" element={<TopicDetailPage />} />
        </Routes>
      </MemoryRouter>
    </ChildModeProvider>,
  )
}

describe('TopicDetailPage', () => {
  beforeEach(() => {
    localStorage.clear()
    getTopic.mockResolvedValue(topic)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('groups topic entries and links core terms to their profiles', async () => {
    renderTopic()

    expect(await screen.findByRole('heading', { name: '淮河文化', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '查看术语档案：淮河文化' })).toHaveAttribute('href', '/terms/8')
    expect(screen.getByRole('heading', { name: '核心术语' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '文化人物' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '淮河本草' })).toBeInTheDocument()
    expect(screen.getByText('管仲')).toBeInTheDocument()
    expect(screen.getByText('honeysuckle')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: '专题内容导航' })).toBeInTheDocument()
  })

  it('shows an empty topic without hiding its research context', async () => {
    getTopic.mockResolvedValue({ ...topic, item_count: 0, term_count: 0, entry_type_counts: {}, items: [] })
    renderTopic()

    expect(await screen.findByRole('heading', { name: '淮河文化', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('该专题目前没有可公开展示的条目。')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回文化专题' })).toHaveAttribute('href', '/topics')
  })

  it('retries a recoverable request failure', async () => {
    const user = userEvent.setup()
    getTopic.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(topic)
    renderTopic()

    await user.click(await screen.findByRole('button', { name: '重新加载专题' }))

    expect(await screen.findByRole('heading', { name: '淮河文化', level: 1 })).toBeInTheDocument()
    expect(getTopic).toHaveBeenCalledTimes(2)
  })

  it('shows a topic-not-found state for a 404 response', async () => {
    getTopic.mockRejectedValue({ response: { status: 404 } })
    renderTopic('/topics/missing')

    expect(await screen.findByText('专题不存在或尚未发布')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '重新加载专题' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回文化专题' })).toHaveAttribute('href', '/topics')
  })

  it('uses child-friendly section guidance without rewriting stored data', async () => {
    localStorage.setItem('termbase-reading-preferences', JSON.stringify({ childMode: true }))
    renderTopic()

    expect(await screen.findByText('先认识这些词')).toBeInTheDocument()
    expect(screen.getByText('再看看相关人物和事物')).toBeInTheDocument()
    expect(screen.getByText(topic.summary as string)).toBeInTheDocument()
  })
})
