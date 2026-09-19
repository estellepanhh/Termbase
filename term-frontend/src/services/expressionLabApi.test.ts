import { beforeEach, describe, expect, it, vi } from 'vitest'

import request from '../utils/request'
import { analyzeExpression } from './expressionLabApi'

vi.mock('../utils/request', () => ({
  default: { post: vi.fn() },
}))

describe('analyzeExpression', () => {
  beforeEach(() => vi.clearAllMocks())

  it('posts the complete task and unwraps the stable response envelope', async () => {
    const input = {
      term_ids: [7],
      source_text: '和而不同强调在差异中寻求和谐共处。',
      target_language: 'en' as const,
      audience: 'overseas_youth' as const,
      scenario: 'cultural_exhibition' as const,
      style: 'explanatory' as const,
      locale: 'general_english' as const,
    }
    const analysis = { request_id: 'req-1', review_status: 'ai_unreviewed' }
    vi.mocked(request.post).mockResolvedValue({ code: 200, message: '分析完成', data: analysis })

    await expect(analyzeExpression(input)).resolves.toBe(analysis)
    expect(request.post).toHaveBeenCalledWith(
      '/api/v1/expression-lab/analyze',
      input,
      { timeout: 60_000 },
    )
  })

  it('keeps interceptor rejections intact', async () => {
    const error = new Error('请求过于频繁')
    vi.mocked(request.post).mockRejectedValue(error)
    await expect(analyzeExpression({} as never)).rejects.toBe(error)
  })
})
