import { describe, expect, it } from 'vitest'
import { RavenError } from '../src/types'
import { parseSSEStream } from '../src/streaming'

function createSSEResponse(chunks: string[]): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

describe('parseSSEStream', () => {
  it('should parse a basic SSE stream', async () => {
    const response = createSSEResponse([
      'data: {"id":"1","object":"chat.completion.chunk","created":123,"model":"gpt-4o","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}\n\n',
      'data: {"id":"1","object":"chat.completion.chunk","created":123,"model":"gpt-4o","choices":[{"index":0,"delta":{"content":" world"},"finish_reason":null}]}\n\n',
      'data: [DONE]\n\n',
    ])

    const chunks = []
    for await (const chunk of parseSSEStream(response)) {
      chunks.push(chunk)
    }

    expect(chunks).toHaveLength(2)
    expect(chunks[0]?.choices[0]?.delta.content).toBe('Hello')
    expect(chunks[1]?.choices[0]?.delta.content).toBe(' world')
  })

  it('should handle chunks split across buffers', async () => {
    const response = createSSEResponse([
      'data: {"id":"1","object":"chat.completion.chunk","created":123,',
      '"model":"gpt-4o","choices":[{"index":0,"delta":{"content":"Hi"},"finish_reason":null}]}\n\ndata: [DONE]\n\n',
    ])

    const chunks = []
    for await (const chunk of parseSSEStream(response)) {
      chunks.push(chunk)
    }

    expect(chunks).toHaveLength(1)
    expect(chunks[0]?.choices[0]?.delta.content).toBe('Hi')
  })

  it('should skip SSE comments', async () => {
    const response = createSSEResponse([
      ': this is a comment\n',
      'data: {"id":"1","object":"chat.completion.chunk","created":123,"model":"gpt-4o","choices":[{"index":0,"delta":{"content":"OK"},"finish_reason":null}]}\n\n',
      'data: [DONE]\n\n',
    ])

    const chunks = []
    for await (const chunk of parseSSEStream(response)) {
      chunks.push(chunk)
    }

    expect(chunks).toHaveLength(1)
  })

  it('should skip empty lines', async () => {
    const response = createSSEResponse([
      '\n\n\n',
      'data: {"id":"1","object":"chat.completion.chunk","created":123,"model":"gpt-4o","choices":[{"index":0,"delta":{"content":"OK"},"finish_reason":null}]}\n\n',
      '\n',
      'data: [DONE]\n\n',
    ])

    const chunks = []
    for await (const chunk of parseSSEStream(response)) {
      chunks.push(chunk)
    }

    expect(chunks).toHaveLength(1)
  })

  it('should throw on null response body', async () => {
    const response = new Response(null, { status: 200 })

    const iterator = parseSSEStream(response)

    await expect(async () => {
      for await (const _ of iterator) {
        // Should not reach here
      }
    }).rejects.toThrow(RavenError)
  })

  it('should throw on invalid JSON in SSE data', async () => {
    const response = createSSEResponse([
      'data: {invalid json}\n\n',
    ])

    await expect(async () => {
      for await (const _ of parseSSEStream(response)) {
        // Should throw
      }
    }).rejects.toThrow(RavenError)
  })

  it('should handle [DONE] at the end without trailing newlines', async () => {
    const response = createSSEResponse([
      'data: {"id":"1","object":"chat.completion.chunk","created":123,"model":"gpt-4o","choices":[{"index":0,"delta":{"content":"Hi"},"finish_reason":null}]}\n\n',
      'data: [DONE]',
    ])

    const chunks = []
    for await (const chunk of parseSSEStream(response)) {
      chunks.push(chunk)
    }

    expect(chunks).toHaveLength(1)
  })
})
