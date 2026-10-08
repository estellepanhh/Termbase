import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TermProfile } from '../../types/knowledge'
import * as api from '../../services/knowledgeApi'
import TermProfilePage from './TermProfilePage'
import { ChildModeProvider } from '../../context/ChildModeContext'

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
  interpretation_count: 3,
  record_count: 3,
  interpretations: [
    {
      index: 1,
      title: '哲学思想',
      explanation: '强调差异基础上的协调共生。',
      definition_zh: '承认差异并追求和谐共处。',
      cultural_connotation: '强调差异基础上的协调共生。',
      term_level: '本源层',
      culture_category: '中华优秀传统文化',
      record_id: 1,
    },
    {
      index: 2,
      title: '社会交往',
      explanation: '在共同目标下保留不同意见。',
      definition_zh: '处理群体差异的交往原则。',
      cultural_connotation: '在共同目标下保留不同意见。',
      term_level: '拓展层',
      culture_category: '社会文化',
      record_id: 2,
    },
    {
      index: 3,
      title: '国际传播',
      explanation: '文明交流不以消除差异为前提。',
      definition_zh: '面向文明互鉴的表达原则。',
      cultural_connotation: '文明交流不以消除差异为前提。',
      term_level: '核心层',
      culture_category: '国际传播',
      record_id: 3,
    },
  ],
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
  }, {
    context_code: 'children', context_name_zh: '儿童', audience: 'children', style: '通俗',
    description: '', explanation: '每个人可以不一样，也可以友好地一起做事。', example: '', note: null,
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
  }],
}

function renderProfile(initialEntry = '/terms/1') {
  return render(
    <ChildModeProvider><MemoryRouter initialEntries={[initialEntry]}>
      <Routes><Route path="/terms/:id" element={<TermProfilePage />} /><Route path="/discover" element={<h1>术语探索</h1>} /></Routes>
    </MemoryRouter></ChildModeProvider>,
  )
}

describe('TermProfilePage', () => {
  beforeEach(() => {
    localStorage.clear()
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
    const contexts = screen.getByRole('region', { name: '适用场景' })
    expect(within(contexts).getByRole('heading', { name: '国际交流' })).toBeInTheDocument()
    expect(within(contexts).queryByRole('heading', { name: '儿童' })).not.toBeInTheDocument()
    expect(within(contexts).queryByText('每个人可以不一样，也可以友好地一起做事。')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '文化内涵' })).toBeInTheDocument()
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('02')).toBeInTheDocument()
    expect(screen.getByText('03')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '哲学思想' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '国际传播' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '跨文化理解提示' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '协和万邦' })).toHaveAttribute('href', '/terms/2')
    expect(screen.getByRole('link', { name: '文明交流互鉴' })).toHaveAttribute('href', '/topics/civilization-dialogue')
  })

  it('puts the child explanation first when child mode is saved', async () => {
    localStorage.setItem('termbase-reading-preferences', JSON.stringify({ childMode: true, largeTextMode: false }))
    renderProfile()
    expect(await screen.findByRole('heading', { name: '给小朋友的话' })).toBeInTheDocument()
    expect(screen.getByText('每个人可以不一样，也可以友好地一起做事。')).toBeInTheDocument()
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
