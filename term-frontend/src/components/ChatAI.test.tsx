import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ChatAI from './ChatAI'

const auth = vi.hoisted(() => ({
  status: 'authenticated' as 'authenticated' | 'unauthenticated',
  token: 'user-token' as string | null,
  user: { username: 'researcher', display_name: '研究员', role: 'user' },
  isAdmin: false,
  login: vi.fn(), register: vi.fn(), logout: vi.fn(),
}))

vi.mock('../context/useAuth', () => ({ useAuth: () => auth }))

function streamResponse(chunks: string[]) {
  const encoder = new TextEncoder()
  return new Response(new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)))
      controller.close()
    },
  }), { status: 200 })
}

async function openChat() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: '打开文脉 AI 助手' }))
  return user
}

describe('ChatAI', () => {
  beforeEach(() => {
    auth.status = 'authenticated'
    auth.token = 'user-token'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens an accessible modal with the digital researcher', async () => {
    render(<ChatAI />)
    const trigger = screen.getByRole('button', { name: '打开文脉 AI 助手' })
    expect(trigger).toContainElement(screen.getByRole('img', { name: '文脉数字研究员' }))
    await openChat()
    expect(screen.getByRole('dialog', { name: '文脉 AI 助手' })).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText(/你好，我可以帮你解释术语/)).toBeInTheDocument()
  })

  it('shows a login path without sending a request when signed out', async () => {
    auth.status = 'unauthenticated'
    auth.token = null
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    render(<ChatAI />)
    await openChat()
    expect(screen.getByText('登录后可使用文脉 AI')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '前往登录' })).toHaveAttribute('href', '/login')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('sends an authenticated request and reassembles split stream content', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(streamResponse([
      'data: {"cont', 'ent":"淮河"}\n\ndata: {"content":"文脉"}\n\ndata: [DONE]\n\n',
    ]))
    render(<ChatAI />)
    await user.click(screen.getByRole('button', { name: '打开文脉 AI 助手' }))
    await user.type(screen.getByRole('textbox'), '解释淮河文化')
    await user.click(screen.getByRole('button', { name: '发送问题' }))
    expect(fetchSpy).toHaveBeenCalledWith('/api/chat/stream', expect.objectContaining({
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer user-token' },
    }))
    expect(await screen.findByText('淮河文脉')).toBeInTheDocument()
  })

  it.each([
    [401, '登录状态已失效，请重新登录。'],
    [429, '提问有点频繁，请稍后再试。'],
    [503, 'AI 服务正在休息，请稍后再试。'],
  ])('shows actionable feedback for HTTP %s without an empty assistant bubble', async (status, message) => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status }))
    render(<ChatAI />)
    await user.click(screen.getByRole('button', { name: '打开文脉 AI 助手' }))
    await user.type(screen.getByRole('textbox'), '解释淮河')
    await user.click(screen.getByRole('button', { name: '发送问题' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByRole('button', { name: '重新发送' })).toBeInTheDocument()
  })

  it('shows a backend stream error and keeps the question available for retry', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(streamResponse(['data: {"error":"AI 服务暂时不可用"}\n\n']))
    render(<ChatAI />)
    await user.click(screen.getByRole('button', { name: '打开文脉 AI 助手' }))
    await user.type(screen.getByRole('textbox'), '解释淮河')
    await user.click(screen.getByRole('button', { name: '发送问题' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('AI 服务暂时不可用')
    expect(screen.getByRole('button', { name: '重新发送' })).toBeInTheDocument()
  })

  it('aborts an in-flight request when the dialog closes', async () => {
    const user = userEvent.setup()
    let requestSignal: AbortSignal | undefined
    vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => {
      requestSignal = init?.signal ?? undefined
      return new Promise(() => undefined)
    })
    render(<ChatAI />)
    await user.click(screen.getByRole('button', { name: '打开文脉 AI 助手' }))
    await user.type(screen.getByRole('textbox'), '解释淮河')
    await user.click(screen.getByRole('button', { name: '发送问题' }))
    await user.click(screen.getByRole('button', { name: '关闭文脉 AI 助手' }))
    await waitFor(() => expect(requestSignal?.aborted).toBe(true))
  })
})
