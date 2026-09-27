import { useEffect, useRef, useState } from 'react'
import { CloseOutlined, SendOutlined } from '@ant-design/icons'

type ChatMessage = { role: 'assistant' | 'user'; content: string }

const modes = ['术语解释', '译法比较', '淮河导览', '儿童化解释']
const quickPrompts = ['解释这个术语', '换成儿童能懂的话', '比较中英表达', '生成传播文案', '关联淮河文化专题']

export default function ChatAI() {
  const [visible, setVisible] = useState(false)
  const [activeMode, setActiveMode] = useState(modes[0])
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: '我是你的文脉研究助手。可以问我术语含义、跨文化表达，或请我带你探索淮河文化。' },
  ])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!inputValue.trim()) return
    const userMsg = inputValue
    setInputValue('')
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)
    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, mode: activeMode }),
      })
      if (!response.ok || !response.body) throw new Error('AI unavailable')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantMsg = ''
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6)
            if (dataStr === '[DONE]') continue
            try {
              const data = JSON.parse(dataStr)
              if (data.content) {
                assistantMsg += data.content
                setMessages((prev) => {
                  const next = [...prev]
                  next[next.length - 1].content = assistantMsg
                  return next
                })
              } else if (data.error) {
                throw new Error(data.error)
              }
            } catch {
              // Ignore malformed stream chunks.
            }
          }
        }
      }
    } catch {
      setMessages((prev) => [...prev.filter((item) => item.content), { role: 'assistant', content: '连接暂时中断了，请稍后再试。' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="culture-assistant">
      {!visible ? (
        <button aria-label="打开文脉 AI 助手" className="culture-assistant__trigger" onClick={() => setVisible(true)} type="button">
          <span aria-hidden="true">文脉 AI</span>
          <strong>研究助手</strong>
        </button>
      ) : null}
      {visible ? (
        <section aria-label="文脉 AI 助手" aria-modal="false" className="culture-assistant__panel" role="dialog">
          <div className="culture-assistant__header">
            <div>
              <span>HUMAN-AI RESEARCH DRAWER</span>
              <strong>文脉 AI 助手</strong>
              <small>术语解释 · 译法比较 · 专题导览</small>
            </div>
            <button aria-label="关闭文脉 AI 助手" onClick={() => setVisible(false)} type="button"><CloseOutlined /></button>
          </div>
          <div className="culture-assistant__modes" aria-label="AI 助手模式">
            {modes.map((mode) => (
              <button aria-pressed={activeMode === mode} key={mode} onClick={() => setActiveMode(mode)} type="button">{mode}</button>
            ))}
          </div>
          <div aria-label="快捷问题" className="culture-assistant__prompts">
            {quickPrompts.map((prompt) => (
              <button key={prompt} onClick={() => setInputValue(prompt)} type="button">{prompt}</button>
            ))}
          </div>
          <div aria-live="polite" className="culture-assistant__messages">
            {messages.map((msg, idx) => (
              <p className={`culture-assistant__message culture-assistant__message--${msg.role}`} key={idx}>{msg.content}</p>
            ))}
            {loading ? <p className="culture-assistant__thinking">正在沿着知识脉络思考…</p> : null}
            <div ref={messagesEndRef} />
          </div>
          <div className="culture-assistant__composer">
            <textarea
              aria-label="输入给文脉 AI 的问题"
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage() } }}
              placeholder="问一个术语，或一段表达…"
              rows={2}
              value={inputValue}
            />
            <button aria-label="发送问题" disabled={loading || !inputValue.trim()} onClick={() => void sendMessage()} type="button"><SendOutlined /></button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
