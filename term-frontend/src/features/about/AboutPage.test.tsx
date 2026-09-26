import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ReadingPreferenceControls from '../../components/ReadingPreferenceControls'
import { ChildModeProvider } from '../../context/ChildModeContext'
import i18n from '../../locales'
import * as api from '../../services/knowledgeApi'
import AboutPage from './AboutPage'

vi.mock('../../services/knowledgeApi', () => ({
  getProjectOverview: vi.fn(),
}))

const getProjectOverview = vi.mocked(api.getProjectOverview)
const overview = {
  term_count: 48,
  translation_count: 76,
  language_count: 4,
  published_topic_count: 1,
}

function renderAbout(withControls = false) {
  return render(
    <ChildModeProvider>
      <MemoryRouter>
        {withControls ? <ReadingPreferenceControls /> : null}
        <AboutPage />
      </MemoryRouter>
    </ChildModeProvider>,
  )
}

describe('AboutPage', () => {
  beforeEach(async () => {
    localStorage.clear()
    await i18n.changeLanguage('zh')
    getProjectOverview.mockResolvedValue(overview)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('presents the project, research workflow, proven outcomes, and progress', async () => {
    renderAbout()

    expect(screen.getByRole('heading', { name: '中国特色话语多语术语库工程化建设与研究' })).toBeInTheDocument()
    for (const stage of ['术语采集', '规范整理', 'AI 辅助', '人工审校', '多语发布']) {
      expect(screen.getByRole('heading', { name: stage })).toBeInTheDocument()
    }
    expect(await screen.findByText('48')).toBeInTheDocument()
    expect(screen.getByText('76')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '已形成' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '持续建设' })).toBeInTheDocument()
  })

  it('links the four research capabilities to their canonical routes', async () => {
    renderAbout()

    expect(await screen.findByRole('link', { name: '进入术语检索' })).toHaveAttribute('href', '/discover')
    expect(screen.getByRole('link', { name: '进入表达实验室' })).toHaveAttribute('href', '/lab')
    expect(screen.getByRole('link', { name: '查看文化专题' })).toHaveAttribute('href', '/topics')
    expect(screen.getByRole('link', { name: '进入研究工作台' })).toHaveAttribute('href', '/workspace')
  })

  it('keeps static project content usable when outcomes fail and retries safely', async () => {
    const user = userEvent.setup()
    let resolveRetry: ((value: typeof overview) => void) | undefined
    getProjectOverview
      .mockRejectedValueOnce(new Error('network'))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveRetry = resolve }))
    renderAbout()

    expect(screen.getByRole('heading', { name: '中国特色话语多语术语库工程化建设与研究' })).toBeInTheDocument()
    const retry = await screen.findByRole('button', { name: '重新加载成果数据' })
    await user.click(retry)

    expect(screen.getByRole('button', { name: '正在加载成果数据' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '正在加载成果数据' }))
    expect(getProjectOverview).toHaveBeenCalledTimes(2)

    resolveRetry?.(overview)
    expect(await screen.findByText('48')).toBeInTheDocument()
  })

  it('treats an empty database as a valid four-zero outcome', async () => {
    getProjectOverview.mockResolvedValue({
      term_count: 0,
      translation_count: 0,
      language_count: 0,
      published_topic_count: 0,
    })
    renderAbout()

    expect(await screen.findAllByText('0')).toHaveLength(4)
    expect(screen.queryByRole('button', { name: '重新加载成果数据' })).not.toBeInTheDocument()
  })

  it('switches to complete English copy without requesting outcomes again', async () => {
    renderAbout()
    await screen.findByText('48')

    await i18n.changeLanguage('en')

    expect(await screen.findByRole('heading', { name: 'Engineering a Multilingual Terminology Base for Chinese Discourse' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Human review' })).toBeInTheDocument()
    expect(getProjectOverview).toHaveBeenCalledTimes(1)
  })

  it('uses child-friendly copy and preserves loaded outcomes across reading-mode changes', async () => {
    const user = userEvent.setup()
    renderAbout(true)
    await screen.findByText('48')

    await user.click(screen.getByRole('button', { name: '开启儿童模式' }))
    expect(screen.getByRole('heading', { name: '我们怎样把一个词研究清楚' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '开启大字模式' }))

    await waitFor(() => expect(getProjectOverview).toHaveBeenCalledTimes(1))
    expect(screen.getByText('48')).toBeInTheDocument()
  })
})
