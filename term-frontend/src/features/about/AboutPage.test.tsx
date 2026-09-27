import { StrictMode } from 'react'
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

  it('links the public research capabilities to their canonical routes', async () => {
    renderAbout()

    expect(await screen.findByRole('link', { name: '进入术语检索' })).toHaveAttribute('href', '/discover')
    expect(screen.getByRole('link', { name: '进入表达实验室' })).toHaveAttribute('href', '/lab')
    expect(screen.getByRole('link', { name: '查看文化专题' })).toHaveAttribute('href', '/topics')
    expect(screen.queryByRole('link', { name: '进入研究工作台' })).not.toBeInTheDocument()
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
    expect(screen.getByText('有些中国概念有自己的故事和文化背景，不能只在字典里找一个词来替换。')).toBeInTheDocument()
    expect(screen.getByText('先从文章和资料里找出值得研究的重要概念。')).toBeInTheDocument()
    expect(screen.getByText('不只找对应词，还要看看在什么场合、对谁、应该怎样说。')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '开启大字模式' }))

    await waitFor(() => expect(getProjectOverview).toHaveBeenCalledTimes(1))
    expect(screen.getByText('48')).toBeInTheDocument()
    expect(document.querySelector('.about-page')).toHaveAttribute('data-large-text', 'true')
  })

  it('starts one overview request when mounted under React Strict Mode', async () => {
    render(
      <StrictMode>
        <ChildModeProvider><MemoryRouter><AboutPage /></MemoryRouter></ChildModeProvider>
      </StrictMode>,
    )

    expect(await screen.findByText('48')).toBeInTheDocument()
    expect(getProjectOverview).toHaveBeenCalledTimes(1)
  })
})
