import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AppRoutes from '../../app/routes'
import * as knowledgeApi from '../../services/knowledgeApi'
import * as expressionApi from '../../services/expressionLabApi'
import '../../locales'

vi.mock('../../services/knowledgeApi', () => ({ listTerms: vi.fn(), getTerm: vi.fn() }))
vi.mock('../../services/expressionLabApi', () => ({ analyzeExpression: vi.fn() }))

const summary = {
  id: 7, preferred_name_zh: '和而不同', definition_zh: '承认差异并追求和谐共处。', term_level: '本源层', culture_category: '传统文化', data_quality: 'curated',
  recommended_translation: { language_code: 'en', language_name_zh: '英语', text: 'harmony in diversity', translation_type: 'recommended', authority_level: 'curated', review_status: 'reviewed' },
  language_count: 1, source_count: 1,
}
const profile = { ...summary, cultural_connotation: '尊重差异', names: [], translations: [], sources: [{ id: 13, title: '中华思想文化术语', organization: '术语项目', source_type: 'book', url: null, citation: null, authority_level: 'verified', summary: null, language_code: null, published_at: null, legacy_value: null, evidence: [] }], contexts: [], cultural_notes: [], relations: [], topics: [] }

describe('ExpressionLabPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(knowledgeApi.listTerms).mockResolvedValue({ data: [summary], meta: { page: 1, page_size: 8, total: 1 } })
    vi.mocked(knowledgeApi.getTerm).mockResolvedValue(profile)
    vi.mocked(expressionApi.analyzeExpression).mockResolvedValue({
      request_id: 'req-1', input_summary: { source_text: '和而不同强调在差异中寻求和谐共处。', target_language: 'en', audience: 'overseas_youth', scenario: 'cultural_exhibition', style: 'explanatory', locale: 'general_english' },
      knowledge_summary: { term_count: 1, translation_count: 1, source_count: 1, context_count: 0, truncated: false },
      report: { recommended: { text: 'Harmony in diversity', rationale: '保留差异', strategy: ['解释性翻译'] }, alternatives: [{ text: 'Harmony without uniformity', best_for: '学术', tradeoff: '书面' }], term_usage: [], cultural_risks: [], references: [], limitations: ['需复核'], review_priority: 'medium' },
      generated_at: '2026-09-19T12:00:00Z', review_status: 'ai_unreviewed', warnings: [],
    })
  })

  it('mounts the real route, selects knowledge and submits the fixed task contract', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/lab']}><AppRoutes /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: '跨文化表达实验室' })).toBeInTheDocument()
    expect(screen.queryByText('该研究功能处于下一阶段建设')).not.toBeInTheDocument()

    await user.type(screen.getByRole('searchbox', { name: '搜索已发布术语' }), '和而')
    await user.click(screen.getByRole('button', { name: '搜索术语' }))
    await user.click(await screen.findByRole('button', { name: '添加 和而不同' }))
    expect(await screen.findByText('harmony in diversity')).toBeInTheDocument()
    expect(screen.getByText('中华思想文化术语')).toBeInTheDocument()

    await user.type(screen.getByLabelText('中文待表达文本'), '和而不同强调在差异中寻求和谐共处。')
    await user.click(screen.getByRole('button', { name: '生成跨文化表达报告' }))
    await waitFor(() => expect(expressionApi.analyzeExpression).toHaveBeenCalledWith(expect.objectContaining({ term_ids: [7], target_language: 'en', audience: 'overseas_youth' })))
    expect(await screen.findByText('Harmony in diversity')).toBeInTheDocument()
  })

  it('blocks submission until term and valid text are provided', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/lab']}><AppRoutes /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: '生成跨文化表达报告' }))
    expect(screen.getByText('请至少选择一个术语')).toBeInTheDocument()
    expect(screen.getByText('请输入10至1000字中文文本')).toBeInTheDocument()
    expect(expressionApi.analyzeExpression).not.toHaveBeenCalled()
  })
})
