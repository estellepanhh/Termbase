import { describe, expect, it } from 'vitest'
import { presentLanguage, presentReviewStatus, presentTranslationType } from './translationPresentation'

describe('translation presentation', () => {
  it.each([
    ['reviewed', '已校订'],
    ['pending', '待校订'],
    ['unreviewed', '待校订'],
    ['internal_state', null],
  ])('maps review state %s without exposing internal values', (status, expected) => {
    expect(presentReviewStatus(status)).toBe(expected)
  })

  it.each([
    ['und', '未指定语言', '其他语种'],
    ['und', '', '其他语种'],
    ['fr', '法语', '法语'],
    ['es', '', '西班牙语'],
    ['xx', '', '其他语种'],
  ])('presents language %s / %s as %s', (code, name, expected) => {
    expect(presentLanguage(code, name)).toBe(expected)
  })

  it('uses a meaningful fallback for an unknown translation type', () => {
    expect(presentTranslationType('legacy')).toBe('参考译法')
  })
})
