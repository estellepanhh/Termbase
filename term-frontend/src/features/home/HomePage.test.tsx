import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../locales'
import { AuthProvider } from '../../context/AuthContext'
import * as api from '../../services/knowledgeApi'
import type { TopicSummary } from '../../types/knowledge'
import HomePage from './HomePage'

vi.mock('../../services/knowledgeApi', () => ({ listTopics: vi.fn() }))

const listTopics = vi.mocked(api.listTopics)
const topics: TopicSummary[] = [
  { slug: 'huaihe-culture', title: '淮河文化', summary: '沿淮文化记忆。', item_count: 181, term_count: 140, entry_type_counts: { term: 140 } },
  { slug: 'huizhou-culture', title: '徽州文化', summary: '徽商与传统技艺。', item_count: 44, term_count: 44, entry_type_counts: { term: 44 } },
  { slug: 'excellent-traditional-chinese-culture', title: '中华优秀传统文化', summary: '传统文化资源。', item_count: 269, term_count: 269, entry_type_counts: { term: 269 } },
]

function renderHome() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <HomePage /><LocationProbe />
      </MemoryRouter>
    </AuthProvider>,
  )
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="home-location">{`${location.pathname}${location.search}`}</output>
}

describe('HomePage', () => {
  beforeEach(async () => {
    localStorage.clear()
    await i18n.changeLanguage('zh')
    listTopics.mockResolvedValue(topics)
  })

  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('presents an open editorial homepage with a direct term search', async () => {
    const user = userEvent.setup()
    renderHome()

    expect(screen.getByRole('heading', { name: '中国特色话语多语术语库' })).toBeInTheDocument()
    await user.type(screen.getByRole('searchbox', { name: '检索术语' }), '淮河文化')
    await user.click(screen.getByRole('button', { name: '开始检索' }))
    expect(screen.getByTestId('home-location')).toHaveTextContent('/discover?q=%E6%B7%AE%E6%B2%B3%E6%96%87%E5%8C%96')
    expect(screen.getByRole('navigation', { name: '平台使用路径' })).toBeInTheDocument()
    expect(screen.queryByText('文脉知识工程')).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: '文化专题总览' })).toBeInTheDocument()
    expect(screen.queryByText('淮河文化示范专题')).not.toBeInTheDocument()
  })

  it('keeps public research entrances available to normal visitors', async () => {
    renderHome()

    expect(screen.getAllByRole('link', { name: '进入术语检索' })[0]).toHaveAttribute('href', '/discover')
    expect(screen.getAllByRole('link', { name: '参与术语共建' })[0]).toHaveAttribute('href', '/co-construction')
    expect(screen.queryByRole('link', { name: '进入表达实验室' })).not.toBeInTheDocument()
    expect(await screen.findByRole('link', { name: '查看全部文化专题' })).toHaveAttribute('href', '/topics')
    expect(screen.queryByRole('link', { name: '进入术语管理' })).not.toBeInTheDocument()
  })

  it('shows every loaded cultural topic instead of promoting only Huaihe', async () => {
    renderHome()

    const directory = await screen.findByRole('navigation', { name: '首页文化专题目录' })
    expect(directory).toHaveTextContent('淮河文化')
    expect(directory).toHaveTextContent('徽州文化')
    expect(directory).toHaveTextContent('中华优秀传统文化')
    expect(screen.getByRole('link', { name: /进入徽州文化专题/ })).toHaveAttribute('href', '/topics/huizhou-culture')
  })

  it('keeps the full catalog available when homepage topic loading fails', async () => {
    listTopics.mockRejectedValue(new Error('network'))
    renderHome()

    expect(await screen.findByText('专题目录暂时无法加载，可进入完整专题页查看。')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '查看全部文化专题' })).toHaveAttribute('href', '/topics')
  })

  it('shows the term management entrance only for admins', () => {
    localStorage.setItem('termbase-auth', JSON.stringify({
      token: 'admin-token',
      user: { username: 'admin', role: 'admin', display_name: '管理员' },
    }))

    renderHome()

    expect(screen.getByRole('link', { name: '进入术语管理' })).toHaveAttribute('href', '/manage')
  })
})
