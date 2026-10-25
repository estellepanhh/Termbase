export type ChatServiceErrorKind = 'auth' | 'validation' | 'rate-limit' | 'server' | 'network' | 'stream'

export class ChatServiceError extends Error {
  readonly kind: ChatServiceErrorKind

  constructor(kind: ChatServiceErrorKind, message: string) {
    super(message)
    this.name = 'ChatServiceError'
    this.kind = kind
  }
}

function abortError() {
  return new DOMException('The operation was aborted.', 'AbortError')
}

function parseEvent(event: string, onContent: (content: string) => void) {
  const payload = event
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')

  if (!payload || payload === '[DONE]') return

  let data: { content?: unknown; error?: unknown }
  try {
    data = JSON.parse(payload) as { content?: unknown; error?: unknown }
  } catch {
    throw new ChatServiceError('stream', 'AI 返回的数据格式异常，请重新尝试。')
  }

  if (typeof data.error === 'string' && data.error) {
    throw new ChatServiceError('stream', data.error)
  }
  if (typeof data.content === 'string' && data.content) onContent(data.content)
}

export async function consumeChatStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onContent: (content: string) => void,
  signal?: AbortSignal,
) {
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    if (signal?.aborted) {
      await reader.cancel().catch(() => undefined)
      throw abortError()
    }
    const { done, value } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    buffer = buffer.replace(/\r\n/g, '\n')

    let boundary = buffer.indexOf('\n\n')
    while (boundary >= 0) {
      parseEvent(buffer.slice(0, boundary), onContent)
      buffer = buffer.slice(boundary + 2)
      boundary = buffer.indexOf('\n\n')
    }

    if (done) break
  }

  if (buffer.trim()) parseEvent(buffer, onContent)
}
