import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ResearchAvatar from './ResearchAvatar'

describe('ResearchAvatar', () => {
  it.each([
    ['compact', false],
    ['stage', true],
  ])('uses two curved smiling-eye lines in the %s avatar', (_variant, stage) => {
    const { container } = render(<ResearchAvatar stage={stage} />)
    const eyes = container.querySelector('.research-avatar__eyes')
    const eyeLines = eyes?.querySelectorAll('path')

    expect(eyes?.querySelector('ellipse')).not.toBeInTheDocument()
    expect(eyeLines).toHaveLength(2)
    eyeLines?.forEach((eye) => expect(eye.getAttribute('d')).toMatch(/[qQ]/))
  })
})
