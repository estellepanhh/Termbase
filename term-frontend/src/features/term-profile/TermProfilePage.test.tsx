import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TermProfile } from '../../types/knowledge'
import * as api from '../../services/knowledgeApi'
import TermProfilePage from './TermProfilePage'

vi.mock('../../services/knowledgeApi', () => ({
  getTerm: vi.fn(),
}))

const getTerm = vi.mocked(api.getTerm)

const profile: TermProfile = {
  id: 1,
  preferred_name_zh: '和而不同',
  definition_zh: '承认差异并追求和谐共处。',
  cultural_connotation: '强调差异基础上的协调共生。',
  term_level: '本源层',
  culture_category: '中华优秀传统文化',
  data_quality: 'legacy_unreviewed',
  recommended_translation: null,
  language_count: 1,
  source_count: 1,
  names: [{ name: '和同', name_type: '异名' }],
  translations: [
    {
      language_code: 'en',
      language_name_zh: '英语',
      text: 'harmony in diversity',
      translation_type: 'recommended',
      authority_level: 'official',
      review_status: 'reviewed',
      region: null,
      note: null,
      contexts: [],
    },
    {
      language_code: 'en',
      language_name_zh: '英语',
      text: 'harmonious difference',
      translation_type: 'acceptable',
      authority_level: 'research',
      review_status: 'pending',
      region: null,
      note: '仅供研究语境参照。',
      contexts: [],
    },
  ],
  sources: [{
    id: 1,
    title: '论语',
    organization: '中华书局',
    published_at: null,
    language_code: 'zh',
    source_type: '典籍',
    url: 'https://example.com/lunyu',
    citation: '《子路》',
    authority_level: 'research',
    summary: null,
    legacy_value: '旧版来源标注',
    evidence: [{
      id: 1,
      translation_id: null,
      original_excerpt: '君子和而不同。',
      translated_excerpt: 'The superior man is harmonious but not conformist.',
      locator: '第十三篇',
      note: '译文用于说明跨文化表达。',
    }],
  }],
  contexts: [{
    context_code: 'public-diplomacy',
    context_name_zh: '国际交流',
    audience: '海外公众',
    style: '正式',
    description: '用于说明中国倡导的文明交流理念。',
    explanation: '先说明尊重差异，再强调共同合作。',
    example: '文明交流互鉴应坚持和而不同。',
    note: null,
  }],
  cultural_notes: [{
    target_culture: '英语文化语境',
    difference_summary: '不等同于消除分歧的一致性。',
    literal_risk: '直译为 sameness 会弱化差异的价值。',
    misconception: '误解为回避原则问题。',
    recommendation: '结合具体分歧与合作目标解释。',
  }],
  relations: [{
    direction: 'outgoing',
    relation_type: '相关概念',
    source_term_id: 1,
    source_term_name_zh: '和而不同',
    target_term_id: 2,
    target_term_name_zh: '协和万邦',
  }],
  topics: [{
    slug: 'civilization-dialogue',
    title: '文明交流互鉴',
    summary: '跨文化交流专题。',
    entry_type: 'term',
    item_title: '和而不同',
    payload: {},
  }],
}

function renderProfile(initialEntry = '/terms/1') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/terms/:id" element={<TermProfilePage />} />
        <Route path="/discover" element={<h1>术语探索</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TermProfilePage', () => {
  beforeEach(() => {
    getTerm.mockResolvedValue(profile)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('shows translation and evidence as first-class knowledge', async () => {
    renderProfile()

    expect(await screen.findByRole('heading', { name: '和而不同' })).toBeInTheDocument()
    expect(screen.getByText('历史数据待复核')).toBeInTheDocument()
    expect(screen.getByText('harmony in diversity')).toBeInTheDocument()
    expect(screen.getByText('harmonious difference')).toBeInTheDocument()
    expect(screen.getByText('状态：待审核')).toBeInTheDocument()
    expect(screen.queryByText('官方')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '来源与依据' })).toBeInTheDocument()
    expect(screen.getByText('论语')).toBeInTheDocument()
    expect(screen.getByText('君子和而不同。')).toBeInTheDocument()
    expect(screen.getByText('来源类型：典籍')).toBeInTheDocument()
    expect(screen.getByText('语种：zh')).toBeInTheDocument()
    expect(screen.getByText('权威级别：research')).toBeInTheDocument()
    expect(screen.getByText('历史来源值：旧版来源标注')).toBeInTheDocument()
    expect(screen.getByText('证据说明：译文用于说明跨文化表达。')).toBeInTheDocument()
    const sourceLink = screen.getByRole('link', { name: '访问来源：论语' })
    expect(sourceLink).toHaveAttribute('target', '_blank')
    expect(sourceLink).toHaveAttribute('rel', 'noreferrer noopener')
    expect(screen.getByRole('heading', { name: '适用场景' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '跨文化理解提示' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '协和万邦' })).toHaveAttribute('href', '/terms/2')
    expect(screen.getByRole('link', { name: '文明交流互鉴' })).toHaveAttribute('href', '/topics?topic=civilization-dialogue')
  })

  it('omits optional panels and offers a retry after a network failure', async () => {
    getTerm
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({
        ...profile,
        contexts: [],
        cultural_notes: [],
        relations: [],
        topics: [],
        names: [],
        sources: [{
          ...profile.sources[0],
          source_type: '',
          language_code: null,
          authority_level: null,
          legacy_value: null,
          evidence: [{ ...profile.sources[0].evidence[0], note: null }],
        }],
      })
    const user = userEvent.setup()
    renderProfile()

    await user.click(await screen.findByRole('button', { name: '重试加载术语' }))

    expect(await screen.findByRole('heading', { name: '和而不同' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '适用场景' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '跨文化理解提示' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '相关概念与专题' })).not.toBeInTheDocument()
    expect(screen.queryByText('来源类型：')).not.toBeInTheDocument()
    expect(screen.queryByText('证据说明：')).not.toBeInTheDocument()
    expect(getTerm).toHaveBeenCalledTimes(2)
  })

  it('shows a discover link when the requested term is not found', async () => {
    getTerm.mockRejectedValueOnce({ response: { status: 404 } })
    renderProfile('/terms/404')

    expect(await screen.findByRole('heading', { name: '未找到该术语' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回术语探索' })).toHaveAttribute('href', '/discover')
  })

  it.each(['not-a-number', '0', '-1', '01', '1.0', '1e2', '0x10'])('does not request noncanonical route identifier %s', async (id) => {
    renderProfile(`/terms/${id}`)

    expect(await screen.findByRole('heading', { name: '未找到该术语' })).toBeInTheDocument()
    await waitFor(() => expect(getTerm).not.toHaveBeenCalled())
  })

  it.each(['javascript:alert(1)', 'ftp://example.com/lunyu', 'data:text/plain,unsafe'])('does not render an external source link for unsafe URL %s', async (url) => {
    getTerm.mockResolvedValueOnce({ ...profile, sources: [{ ...profile.sources[0], url }] })
    renderProfile()

    expect(await screen.findByRole('heading', { name: '和而不同' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '访问来源：论语' })).not.toBeInTheDocument()
  })
})
