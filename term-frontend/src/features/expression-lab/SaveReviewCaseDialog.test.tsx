import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExpressionAnalysis } from '../../types/expressionLab'
import * as api from '../../services/reviewWorkspaceApi'
import SaveReviewCaseDialog from './SaveReviewCaseDialog'

vi.mock('../../services/reviewWorkspaceApi', () => ({ createReviewCase: vi.fn() }))

const analysis = {
  request_id: 'req-1', input_summary: { source_text: '和而不同强调在差异中寻求和谐共处。', target_language: 'en', audience: 'overseas_youth', scenario: 'cultural_exhibition', style: 'explanatory', locale: 'general_english' },
  knowledge_summary: { term_count: 1, translation_count: 1, source_count: 0, context_count: 0, truncated: false },
  report: { recommended: { text: 'Harmony in diversity', rationale: '理由', strategy: ['解释'] }, alternatives: [{ text: 'Alternative', best_for: 'Academic', tradeoff: 'Literal' }], term_usage: [], cultural_risks: [], references: [], limitations: ['需复核'], review_priority: 'medium' },
  generated_at: '2026-09-20T00:00:00Z', review_status: 'ai_unreviewed', warnings: [],
} satisfies ExpressionAnalysis

describe('SaveReviewCaseDialog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('validates title and submits the exact analysis once', async () => {
    vi.mocked(api.createReviewCase).mockResolvedValue({ case: { public_id: 'case-1', title: '案例' } as never, created: true })
    const user = userEvent.setup()
    render(<MemoryRouter><SaveReviewCaseDialog analysis={analysis} onClose={() => {}} termIds={[7]} /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: '确认保存' }))
    expect(screen.getByText('请输入案例标题')).toBeInTheDocument()
    await user.type(screen.getByLabelText('案例标题'), '和而不同传播案例')
    await user.click(screen.getByRole('button', { name: '确认保存' }))
    await waitFor(() => expect(api.createReviewCase).toHaveBeenCalledWith({ title: '和而不同传播案例', term_ids: [7], analysis }))
    expect(await screen.findByRole('link', { name: '返回表达实验室' })).toHaveAttribute('href', '/lab')
    expect(api.createReviewCase).toHaveBeenCalledTimes(1)
  })

  it('keeps content on failure and reports an existing case clearly', async () => {
    vi.mocked(api.createReviewCase).mockRejectedValueOnce(new Error('网络失败')).mockResolvedValueOnce({ case: { public_id: 'case-2' } as never, created: false })
    const user = userEvent.setup()
    render(<MemoryRouter><SaveReviewCaseDialog analysis={analysis} onClose={() => {}} termIds={[7]} /></MemoryRouter>)
    await user.type(screen.getByLabelText('案例标题'), '保留的标题')
    await user.click(screen.getByRole('button', { name: '确认保存' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('网络失败')
    expect(screen.getByLabelText('案例标题')).toHaveValue('保留的标题')
    await user.click(screen.getByRole('button', { name: '确认保存' }))
    expect(await screen.findByText('该报告已经保存过。')).toBeInTheDocument()
  })
})
