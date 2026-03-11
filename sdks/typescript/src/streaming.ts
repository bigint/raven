import type { ChatCompletionChunk } from './types'
import { RavenError } from './types'

export async function* parseSSEStream(response: Response): AsyncIterable<ChatCompletionChunk> {
  if (!response.body) {
    throw new RavenError('Response body is null', 0, 'stream_error')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        // Process any remaining data in the buffer
        if (buffer.trim()) {
          const chunk = processLine(buffer)
          if (chunk) {
            yield chunk
          }
        }
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')

      // Keep the last potentially incomplete line in the buffer
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()

        if (trimmed === '') {
          continue
        }

        if (trimmed.startsWith(':')) {
          // SSE comment, skip
          continue
        }

        const chunk = processLine(trimmed)
        if (chunk === null) {
          // [DONE] signal
          return
        }
        if (chunk) {
          yield chunk
        }
      }
    }
  } catch (error) {
    if (error instanceof RavenError) {
      throw error
    }
    throw new RavenError(
      `Stream interrupted: ${error instanceof Error ? error.message : String(error)}`,
      0,
      'stream_error',
    )
  } finally {
    reader.releaseLock()
  }
}

function processLine(line: string): ChatCompletionChunk | null | undefined {
  if (!line.startsWith('data: ')) {
    return undefined
  }

  const data = line.slice(6).trim()

  if (data === '[DONE]') {
    return null
  }

  try {
    return JSON.parse(data) as ChatCompletionChunk
  } catch {
    throw new RavenError(`Failed to parse SSE data: ${data}`, 0, 'parse_error')
  }
}
