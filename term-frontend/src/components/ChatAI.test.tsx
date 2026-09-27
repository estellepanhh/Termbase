import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import ChatAI from './ChatAI'

describe('ChatAI', () => {
  it('opens a research drawer with mode chips and quick prompts', async () => {
    const user = userEvent.setup()
    render(<ChatAI />)

    await user.click(screen.getByRole('button', { name: /文脉 AI/ }))

    expect(screen.getByRole('dialog', { name: '文脉 AI 助手' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '术语解释' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '换成儿童能懂的话' })).toBeInTheDocument()
  })

  it('places a quick prompt into the composer', async () => {
    const user = userEvent.setup()
    render(<ChatAI />)

    await user.click(screen.getByRole('button', { name: /文脉 AI/ }))
    await user.click(screen.getByRole('button', { name: '比较中英表达' }))

    expect(screen.getByRole('textbox')).toHaveValue('比较中英表达')
  })
})
