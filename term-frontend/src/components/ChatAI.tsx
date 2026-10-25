import { useEffect, useRef, useState } from 'react'
import { CloseOutlined, SendOutlined, StopOutlined } from '@ant-design/icons'
import { useAuth } from '../context/useAuth'
import ResearchAvatar from './ResearchAvatar'
import { ChatServiceError, consumeChatStream } from './chat/streamParser'

type ChatMessage = { id: number; role: 'assistant' | 'user'; content: string }

const welcomeMessage: ChatMessage = {
  id: 1,
  role: 'assistant',
  content: '你好，我可以帮你解释术语、整理多语表达，或从文化传播角度润色说明。你可以直接输入想了解的术语或问题。',
}

async function errorForResponse(response: Response) {
  if (response.status === 401 || response.status === 403) return new ChatServiceError('auth', '登录状态已失效，请重新登录。')
  if (response.status === 400 || response.status === 413) {
    const fallback = response.status === 413 ? '问题太长，请控制在 500 字以内。' : '请输入有效的问题后再发送。'
    try {
      const payload = await response.json() as { msg?: unknown; message?: unknown }
      const message = typeof payload.msg === 'string' ? payload.msg : typeof payload.message === 'string' ? payload.message : fallback
      return new ChatServiceError('validation', message)
    } catch {
      return new ChatServiceError('validation', fallback)
    }
  }
  if (response.status === 429) return new ChatServiceError('rate-limit', '提问有点频繁，请稍后再试。')
  return new ChatServiceError('server', 'AI 服务正在休息，请稍后再试。')
}

function publicError(error: unknown) {
  if (error instanceof ChatServiceError) return error.message
  return '网络连接暂时中断，请检查网络后重新尝试。'
}

export default function ChatAI() {
  const auth = useAuth()
  const [visible, setVisible] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastQuestion, setLastQuestion] = useState('')
  const [canRetry, setCanRetry] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const wasOpenRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const nextMessageId = useRef(2)

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, error, loading])

  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (visible) {
        wasOpenRef.current = true
        const target = inputRef.current ?? dialogRef.current?.querySelector<HTMLElement>('button, a[href], textarea')
        target?.focus()
      } else if (wasOpenRef.current) {
        triggerRef.current?.focus()
      }
    })
    return () => window.clearTimeout(timer)
  }, [visible, auth.status])

  const closeDialog = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setLoading(false)
    setVisible(false)
  }

  const stopResponse = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setLoading(false)
  }

  const sendMessage = async (question = inputValue) => {
    const userMsg = question.trim()
    if (!userMsg || auth.status !== 'authenticated' || !auth.token || loading) return

    setInputValue('')
    setError('')
    setCanRetry(false)
    setLastQuestion(userMsg)
    setMessages((previous) => [...previous, { id: nextMessageId.current++, role: 'user', content: userMsg }])
    setLoading(true)
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ message: userMsg }),
        signal: controller.signal,
      })
      if (!response.ok) throw await errorForResponse(response)
      if (!response.body) throw new ChatServiceError('stream', 'AI 没有返回内容，请重新尝试。')

      let assistantId: number | null = null
      let assistantText = ''
      await consumeChatStream(response.body.getReader(), (content) => {
        assistantText += content
        if (assistantId === null) {
          assistantId = nextMessageId.current++
          setMessages((previous) => [...previous, { id: assistantId as number, role: 'assistant', content: assistantText }])
        } else {
          const id = assistantId
          setMessages((previous) => previous.map((message) => message.id === id ? { ...message, content: assistantText } : message))
        }
      }, controller.signal)
      if (!assistantText) throw new ChatServiceError('stream', 'AI 没有返回内容，请重新尝试。')
      setLastQuestion('')
    } catch (caught) {
      if ((caught as { name?: string })?.name !== 'AbortError') {
        setError(publicError(caught))
        setCanRetry(caught instanceof ChatServiceError && !['validation', 'auth'].includes(caught.kind))
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setLoading(false)
    }
  }

  return (
    <div className="culture-assistant">
      {!visible ? (
        <button aria-label="打开文脉 AI 助手" className="culture-assistant__trigger" onClick={() => setVisible(true)} ref={triggerRef} type="button">
          <span className="culture-assistant__avatar"><ResearchAvatar /></span>
          <span className="culture-assistant__trigger-copy"><small>文脉 AI</small><strong>数字研究员</strong></span>
        </button>
      ) : null}

      {visible ? (
        <div className="culture-assistant__backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}>
          <section
            aria-label="文脉 AI 助手"
            aria-modal="true"
            className="culture-assistant__panel"
            data-testid="digital-researcher-stage"
            onKeyDown={(event) => {
              if (event.key === 'Escape') { event.preventDefault(); closeDialog(); return }
              if (event.key !== 'Tab') return
              const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])]
              if (!focusable.length) return
              const first = focusable[0]
              const last = focusable[focusable.length - 1]
              if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
              else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
            }}
            ref={dialogRef}
            role="dialog"
          >
            <button aria-label="关闭文脉 AI 助手" className="culture-assistant__close" onClick={closeDialog} type="button"><CloseOutlined /></button>
            <div className="culture-assistant__avatar-stage">
              <ResearchAvatar stage thinking={loading} />
              <div className="culture-assistant__avatar-label"><strong>文脉数字研究员</strong><small>DIGITAL CULTURE GUIDE</small></div>
            </div>
            <div className="culture-assistant__conversation">
              <header className="culture-assistant__conversation-header"><h2>今天想沿哪条文脉出发？</h2><p>我可以解释术语、比较译法，也可以带你认识淮河文化。</p></header>
              {auth.status !== 'authenticated' ? (
                <div className="culture-assistant__login">
                  <p>登录后可使用文脉 AI</p>
                  <span>登录后可继续提问、整理译法并获得文化语境提示。</span>
                  <a href="/login">前往登录</a>
                </div>
              ) : <>
                <div aria-live="polite" className="culture-assistant__messages">
                  {messages.map((message) => <p className={`culture-assistant__message culture-assistant__message--${message.role}`} key={message.id}>{message.content}</p>)}
                  {error ? <div className="culture-assistant__error" role="alert"><span>{error}</span>{canRetry ? <button onClick={() => void sendMessage(lastQuestion)} type="button">重新发送</button> : null}</div> : null}
                  {loading ? <p className="culture-assistant__thinking"><ResearchAvatar thinking /><span>正在梳理文脉…</span></p> : null}
                  <div ref={messagesEndRef} />
                </div>
                <div aria-label="推荐提问" className="culture-assistant__suggestions">
                  {['比较六种译法', '带我游淮河', '儿童版解释'].map((suggestion) => <button key={suggestion} onClick={() => { setInputValue(suggestion); inputRef.current?.focus() }} type="button">{suggestion}</button>)}
                </div>
                <div className="culture-assistant__composer">
                  <textarea
                    aria-label="输入给文脉 AI 的问题"
                    maxLength={500}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage() } }}
                    placeholder="输入术语或文化问题…"
                    ref={inputRef}
                    rows={2}
                    value={inputValue}
                  />
                  {loading
                    ? <button aria-label="停止生成" className="culture-assistant__stop" onClick={stopResponse} type="button"><StopOutlined /></button>
                    : <button aria-label="发送问题" disabled={!inputValue.trim()} onClick={() => void sendMessage()} type="button"><SendOutlined /></button>}
                </div>
              </>}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
