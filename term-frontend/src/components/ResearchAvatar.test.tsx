import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ResearchAvatar from './ResearchAvatar'

const eyeLayers = [
  'research-avatar__eye-white',
  'research-avatar__iris',
  'research-avatar__pupil',
  'research-avatar__eye-highlight',
  'research-avatar__brow',
]

describe('ResearchAvatar', () => {
  it.each([
    ['compact', false],
    ['stage', true],
  ])('renders a complete natural eye treatment in the %s portrait', (_name, stage) => {
    const { container } = render(<ResearchAvatar stage={stage} />)

    eyeLayers.forEach((className) => {
      expect(container.querySelectorAll(`.${className}`)).toHaveLength(2)
    })
  })

  it('keeps the thinking state accessible without changing the researcher identity', () => {
    const { container } = render(<ResearchAvatar thinking stage />)

    expect(screen.getByRole('img', { name: '文脉数字研究员正在思考' })).toBeInTheDocument()
    expect(container.querySelector('.research-avatar')).toHaveClass('is-thinking', 'research-avatar--stage')
  })
})
