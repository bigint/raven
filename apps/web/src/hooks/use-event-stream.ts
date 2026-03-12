'use client'

import { API_URL, getOrgId } from '@/lib/api'
import { useEffect, useRef } from 'react'

type EventHandler = (data: unknown) => void

interface UseEventStreamOptions {
  /** Event types to listen for */
  events: string[]
  /** Called when any subscribed event fires */
  onEvent: EventHandler
  /** Whether the stream is enabled (default: true) */
  enabled?: boolean
}

export function useEventStream({ events, onEvent, enabled = true }: UseEventStreamOptions) {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const eventsRef = useRef(events)
  eventsRef.current = events

  useEffect(() => {
    if (!enabled) return

    const orgId = getOrgId()
    const url = `${API_URL}/v1/events/stream${orgId ? `?orgId=${orgId}` : ''}`
    const es = new EventSource(url, { withCredentials: true })

    const handler = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        onEventRef.current(data)
      } catch {
        // ignore parse errors
      }
    }

    // Register listener for each event type
    for (const event of eventsRef.current) {
      es.addEventListener(event, handler)
    }

    es.addEventListener('error', () => {
      // EventSource auto-reconnects
    })

    return () => {
      es.close()
    }
  }, [enabled, events.join(',')])

  return null
}
