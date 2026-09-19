import { describe, expect, it } from 'vitest'

import type { ExpressionAnalysis } from '../../types/expressionLab'
import { toExpressionJson, toExpressionMarkdown } from './exportExpressionReport'

const analysis: ExpressionAnalysis = {
  request_id: 'req-1',
  input_summary: {
    source_text: '和而不同<script>alert(1)</script>',
    target_language: 'en',
    audience: 'overseas_youth',
    scenario: 'cultural_exhibition',
    style: 'explanatory',
    locale: 'general_english',
  },
  knowledge_summary: { term_count: 1, translation_count: 1, source_count: 1, context_count: 0, truncated: false },
  report: {
    recommended: { text: 'Harmony in diversity', rationale: '保留差异。', strategy: ['解释性翻译'] },
    alternatives: [{ text: 'Harmony without uniformity', best_for: '学术场景', tradeoff: '较书面' }],
    term_usage: [{ term_id: 7, translation_id: 11, adopted_translation: 'harmony in diversity', explanation: '采用审校译法' }],
    cultural_risks: [{ level: 'medium', issue: '可能误解为相同', recommendation: '补充差异说明' }],
    references: [{ source_id: 13, title: '中华思想文化术语', organization: '权威术语项目', url: 'https://example.test/source', citation: '术语条目', usage: '支持译法' }],
    limitations: ['需母语编辑复核'],
    review_priority: 'medium',
  },
  generated_at: '2026-09-19T12:00:00+00:00',
  review_status: 'ai_unreviewed',
  warnings: [],
}

describe('expression report export', () => {
  it('renders every research section and the unreviewed notice as Markdown', () => {
    const output = toExpressionMarkdown(analysis)
    for (const expected of ['AI生成、尚未人工复核', '和而不同', 'Harmony in diversity', 'Harmony without uniformity', '学术场景', '可能误解为相同', '中华思想文化术语', '需母语编辑复核', '2026-09-19']) {
      expect(output).toContain(expected)
    }
    expect(output).toContain('<script>alert(1)</script>')
  })

  it('exports only the validated public analysis as JSON', () => {
    const output = toExpressionJson(analysis)
    expect(JSON.parse(output)).toEqual(analysis)
    expect(output.toLowerCase()).not.toContain('api_key')
    expect(output.toLowerCase()).not.toContain('provider_response')
    expect(output.toLowerCase()).not.toContain('system_prompt')
  })
})
