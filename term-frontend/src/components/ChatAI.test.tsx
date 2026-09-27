import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import ChatAI from './ChatAI'

describe('ChatAI', () => {
  it('opens a plain chat popup without task chips', async () => {
    const user = userEvent.setup()
    render(<ChatAI />)

    await user.click(screen.getByRole('button', { name: /文脉 AI/ }))

    expect(screen.getByRole('dialog', { name: '文脉 AI 助手' })).toBeInTheDocument()
    expect(screen.getByText('你好，我是 AI。你可以直接问我问题。')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '术语解释' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '换成儿童能懂的话' })).not.toBeInTheDocument()
  })

  it('keeps a normal question composer', async () => {
    const user = userEvent.setup()
    render(<ChatAI />)

    await user.click(screen.getByRole('button', { name: /文脉 AI/ }))
    await user.type(screen.getByRole('textbox'), '你好')

    expect(screen.getByRole('textbox')).toHaveValue('你好')
  })
})
