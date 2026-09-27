import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../locales'
import * as api from '../services/knowledgeApi'
import AppRoutes from './routes'
import { ChildModeProvider } from '../context/ChildModeContext'

vi.mock('../services/knowledgeApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/knowledgeApi')>()
  return { ...actual, listTopics: vi.fn(), getTopic: vi.fn(), getProjectOverview: vi.fn() }
})

vi.mock('../services/authApi', () => ({
  loginRequest: vi.fn(),
  registerRequest: vi.fn(),
  getCurrentUser: vi.fn(),
  getAuthToken: vi.fn(() => null),
  getStoredAuth: vi.fn(() => {
    const raw = localStorage.getItem('termbase-auth')
    return raw ? JSON.parse(raw) : null
  }),
  saveStoredAuth: vi.fn((auth) => localStorage.setItem('termbase-auth', JSON.stringify(auth))),
  clearStoredAuth: vi.fn(() => localStorage.removeItem('termbase-auth')),
}))

const listTopics = vi.mocked(api.listTopics)
const getTopic = vi.mocked(api.getTopic)
const getProjectOverview = vi.mocked(api.getProjectOverview)
const topicSummary = {
  slug: 'huaihe-culture', title: '淮河文化', summary: '淮河流域文化专题',
  item_count: 0, term_count: 0, entry_type_counts: {},
}

function renderRoute(path = '/discover') {
  return render(
    <ChildModeProvider><MemoryRouter initialEntries={[path]}><AppRoutes /><LocationProbe /></MemoryRouter></ChildModeProvider>,
  )
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="app-location">{location.pathname}</output>
}

describe('research platform application shell', () => {
  beforeEach(async () => {
    localStorage.clear()
    await i18n.changeLanguage('zh')
    listTopics.mockResolvedValue([topicSummary])
    getTopic.mockResolvedValue({ ...topicSummary, items: [] })
    getProjectOverview.mockResolvedValue({ term_count: 48, translation_count: 76, language_count: 4, published_topic_count: 1 })
  })

  afterEach(async () => {
    await i18n.changeLanguage('zh')
  })

  it('renders canonical content inside semantic landmarks and marks its navigation link current', () => {
    renderRoute()

    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveTextContent('术语探索')
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getByText('中国特色话语多语术语库')).toBeInTheDocument()

    const navigation = screen.getByRole('navigation', { name: '主导航' })
    expect(within(navigation).getByRole('link', { name: '术语检索' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('switches the visible shell labels between Chinese and English', async () => {
    const user = userEvent.setup()
    renderRoute()

    await act(async () => {
      await user.click(screen.getByRole('button', { name: '切换至英文' }))
    })

    expect(await screen.findByRole('link', { name: 'Term Search' })).toHaveAttribute(
      'href',
      '/discover',
    )
    expect(screen.getByText('Chinese Cultural Terminology Database')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Co-construction' })).toHaveAttribute('href', '/co-construction')
    expect(screen.queryByRole('link', { name: 'Expression Lab' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Research Workspace' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Project' })).toHaveAttribute('href', '/about')
    expect(screen.getByRole('button', { name: 'Switch to Chinese' })).toBeInTheDocument()
  })

  it.each([
    ['/search', '/discover'],
    ['/browse', '/discover'],
    ['/guide', '/discover'],
    ['/huaihe', '/topics/huaihe-culture'],
    ['/lab', '/login'],
    ['/workspace', '/login'],
  ])('redirects legacy URL %s to the supported public route', async (legacyPath, expectedPath) => {
    renderRoute(legacyPath)

    await waitFor(() => expect(screen.getByTestId('app-location')).toHaveTextContent(expectedPath))
  })

  it('renders the canonical project page and marks its desktop navigation link current', async () => {
    renderRoute('/about')

    expect(await screen.findByRole('heading', { name: '中国特色话语多语术语库工程化建设与研究' })).toBeInTheDocument()
    const navigation = screen.getByRole('navigation', { name: '主导航' })
    expect(within(navigation).getByRole('link', { name: '项目成果' })).toHaveAttribute('aria-current', 'page')
  })

  it('renders the topic index through the application route tree', async () => {
    renderRoute('/topics')

    expect(await screen.findByRole('heading', { name: '文化专题', level: 1 })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: '淮河文化', level: 2 })).toBeInTheDocument()
  })

  it('renders topic detail through the application route tree', async () => {
    renderRoute('/topics/huaihe-culture')

    expect(await screen.findByRole('heading', { name: '淮河文化', level: 1 })).toBeInTheDocument()
    expect(getTopic).toHaveBeenCalledWith('huaihe-culture')
  })

  it('makes mobile navigation available from an accessible menu control', async () => {
    const user = userEvent.setup()
    renderRoute()

    await user.click(screen.getByRole('button', { name: '打开导航菜单' }))

    const navigationDialog = await screen.findByRole('dialog', { name: '主导航' })
    expect(within(navigationDialog).queryByRole('link', { name: '研究工作台' })).not.toBeInTheDocument()
    expect(within(navigationDialog).queryByRole('link', { name: '表达实验室' })).not.toBeInTheDocument()
    expect(within(navigationDialog).getByRole('link', { name: '术语共建' })).toHaveAttribute('href', '/co-construction')
    expect(within(navigationDialog).getByRole('link', { name: '项目成果' })).toHaveAttribute('href', '/about')
    expect(within(navigationDialog).getByRole('button', { name: '切换至英文' })).toBeInTheDocument()
  })

  it('hides term management for normal users and shows it for admins', () => {
    localStorage.setItem('termbase-auth', JSON.stringify({
      token: 'user-token',
      user: { username: 'user', role: 'user', display_name: '普通用户' },
    }))
    const { unmount } = renderRoute('/discover')

    expect(screen.queryByRole('link', { name: '术语管理' })).not.toBeInTheDocument()
    unmount()

    localStorage.setItem('termbase-auth', JSON.stringify({
      token: 'admin-token',
      user: { username: 'admin', role: 'admin', display_name: '管理员' },
    }))
    renderRoute('/discover')

    expect(screen.getByRole('link', { name: '术语管理' })).toHaveAttribute('href', '/manage')
  })

  it('applies child and large-text modes to the full application shell', async () => {
    const user = userEvent.setup()
    renderRoute()
    const shell = document.querySelector('.app-shell')
    await user.click(screen.getByRole('button', { name: '开启儿童模式' }))
    await user.click(screen.getByRole('button', { name: '开启大字模式' }))
    expect(shell).toHaveAttribute('data-child-mode', 'true')
    expect(shell).toHaveAttribute('data-large-text', 'true')
  })

  it('keeps the cultural AI assistant available from every route', async () => {
    const user = userEvent.setup()
    renderRoute('/about')

    await user.click(screen.getByRole('button', { name: '打开文脉 AI 助手' }))

    expect(screen.getByRole('dialog', { name: '文脉 AI 助手' })).toBeInTheDocument()
    expect(screen.getByText(/你好，我是 AI/)).toBeInTheDocument()
  })
})
