import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ChatAI from './ChatAI'

vi.mock('../services/authApi', () => ({
  getAuthToken: vi.fn(() => 'user-token'),
}))

describe('ChatAI', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens a plain chat popup without task chips', async () => {
    const user = userEvent.setup()
    render(<ChatAI />)

    await user.click(screen.getByRole('button', { name: /文脉 AI/ }))

    expect(screen.getByRole('dialog', { name: '文脉 AI 助手' })).toBeInTheDocument()
    expect(screen.getByText('你好，我可以帮你解释术语、整理多语表达，或从文化传播角度润色说明。你可以直接输入想了解的术语或问题。')).toBeInTheDocument()
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

  it('sends authenticated AI requests', async () => {
    const user = userEvent.setup()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"content":"回答"}\n\ndata: [DONE]\n\n'))
        controller.close()
      },
    })
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(stream, { status: 200 }))
    render(<ChatAI />)

    await user.click(screen.getByRole('button', { name: /文脉 AI/ }))
    await user.type(screen.getByRole('textbox'), '解释淮河文化')
    await user.click(screen.getByRole('button', { name: '发送问题' }))

    expect(fetchSpy).toHaveBeenCalledWith('/api/chat/stream', expect.objectContaining({
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer user-token' },
    }))
  })
})
