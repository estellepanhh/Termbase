import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { ExpressionAnalysis } from '../../types/expressionLab'
import ExpressionReport from './ExpressionReport'

const analysis = {
  request_id: 'r', input_summary: { source_text: '原文', target_language: 'en', audience: 'academic', scenario: 'academic_paper', style: 'formal', locale: 'general_english' },
  knowledge_summary: { term_count: 1, translation_count: 1, source_count: 1, context_count: 0, truncated: false },
  report: {
    recommended: { text: '<script>bad()</script>Harmony in diversity', rationale: '保留差异', strategy: ['解释性翻译'] },
    alternatives: [{ text: 'Harmony without uniformity', best_for: '学术', tradeoff: '更书面' }],
    term_usage: [{ term_id: 7, translation_id: 11, adopted_translation: 'harmony in diversity', explanation: '采用审校译法' }],
    cultural_risks: [{ level: 'high', issue: '可能被误解', recommendation: '补充说明' }],
    references: [{ source_id: 13, title: '权威来源', organization: '术语项目', url: 'https://example.test', citation: '条目', usage: '支持译法' }],
    limitations: ['需要母语编辑复核'], review_priority: 'high',
  }, generated_at: '2026-09-19T00:00:00Z', review_status: 'ai_unreviewed', warnings: ['no_valid_references'],
} satisfies ExpressionAnalysis

describe('ExpressionReport', () => {
  it('shows comparable, cited and explicitly unreviewed research output as text', () => {
    render(<MemoryRouter><ExpressionReport analysis={analysis} termNames={{ 7: '和而不同' }} /></MemoryRouter>)
    expect(screen.getByText('AI生成、尚未人工复核')).toBeInTheDocument()
    expect(screen.getByText('Harmony without uniformity')).toBeInTheDocument()
    expect(screen.getByText('学术')).toBeInTheDocument()
    expect(screen.getByText(/高风险/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '权威来源' })).toHaveAttribute('href', 'https://example.test/')
    expect(screen.getByRole('link', { name: '查看 和而不同' })).toHaveAttribute('href', '/terms/7')
    expect(document.querySelector('script')).toBeNull()
  })

  it('copies the recommendation and exposes both export actions', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    render(<MemoryRouter><ExpressionReport analysis={analysis} termNames={{ 7: '和而不同' }} /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: '复制首选表达' }))
    expect(writeText).toHaveBeenCalledWith('<script>bad()</script>Harmony in diversity')
    expect(screen.getByRole('button', { name: '下载 Markdown' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '下载 JSON' })).toBeInTheDocument()
  })
})
