import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ChildModeProvider, useChildMode } from '../context/ChildModeContext'
import ReadingPreferenceControls from './ReadingPreferenceControls'

function Probe() {
  const { isChildMode, isLargeTextMode } = useChildMode()
  return <output>{`${isChildMode ? 'child' : 'standard'}:${isLargeTextMode ? 'large' : 'normal'}`}</output>
}

describe('ReadingPreferenceControls', () => {
  beforeEach(() => localStorage.clear())

  it('toggles independent child and large-text preferences accessibly', async () => {
    const user = userEvent.setup()
    render(<ChildModeProvider><ReadingPreferenceControls /><Probe /></ChildModeProvider>)

    const child = screen.getByRole('button', { name: '开启儿童模式' })
    const large = screen.getByRole('button', { name: '开启大字模式' })
    expect(child).toHaveAttribute('aria-pressed', 'false')
    await user.click(child)
    await user.click(large)

    expect(screen.getByText('child:large')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '关闭儿童模式' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '关闭大字模式' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('restores saved preferences on a later mount', () => {
    localStorage.setItem('termbase-reading-preferences', JSON.stringify({ childMode: true, largeTextMode: true }))
    render(<ChildModeProvider><Probe /></ChildModeProvider>)
    expect(screen.getByText('child:large')).toBeInTheDocument()
  })
})
