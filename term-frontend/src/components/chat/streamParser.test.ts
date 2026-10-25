import { describe, expect, it } from 'vitest'
import { ChatServiceError, consumeChatStream } from './streamParser'

function readerFromChunks(chunks: string[]) {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)))
      controller.close()
    },
  }).getReader()
}

describe('consumeChatStream', () => {
  it('reassembles an SSE JSON event split across network chunks', async () => {
    const received: string[] = []
    await consumeChatStream(
      readerFromChunks(['data: {"cont', 'ent":"淮河"}\n\ndata: [DONE]\n\n']),
      (content) => received.push(content),
    )
    expect(received).toEqual(['淮河'])
  })

  it('reads multiple events from one chunk and ignores the done marker', async () => {
    const received: string[] = []
    await consumeChatStream(
      readerFromChunks(['data: {"content":"文"}\n\ndata: {"content":"脉"}\n\ndata: [DONE]\n\n']),
      (content) => received.push(content),
    )
    expect(received).toEqual(['文', '脉'])
  })

  it('handles a CRLF event boundary split across network chunks', async () => {
    const received: string[] = []
    await consumeChatStream(
      readerFromChunks(['data: {"content":"文"}\r\n\r', '\ndata: {"content":"脉"}\r\n\r\n']),
      (content) => received.push(content),
    )
    expect(received).toEqual(['文', '脉'])
  })

  it('surfaces a backend stream error instead of treating it as malformed JSON', async () => {
    const promise = consumeChatStream(
      readerFromChunks(['data: {"error":"AI 服务暂时不可用"}\n\n']),
      () => undefined,
    )
    await expect(promise).rejects.toEqual(expect.objectContaining({
      name: 'ChatServiceError',
      kind: 'stream',
      message: 'AI 服务暂时不可用',
    }))
  })

  it('processes a final complete event even when the stream closes without a blank line', async () => {
    const received: string[] = []
    await consumeChatStream(
      readerFromChunks(['data: {"content":"记忆"}']),
      (content) => received.push(content),
    )
    expect(received).toEqual(['记忆'])
  })

  it('stops before reading when its signal is aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const promise = consumeChatStream(readerFromChunks(['data: {"content":"不应读取"}\n\n']), () => undefined, controller.signal)
    await expect(promise).rejects.toEqual(expect.objectContaining({ name: 'AbortError' }))
  })

  it('exposes a typed error for callers to map to user-facing feedback', () => {
    expect(new ChatServiceError('rate-limit', '请求较多')).toEqual(expect.objectContaining({
      name: 'ChatServiceError', kind: 'rate-limit', message: '请求较多',
    }))
  })
})
