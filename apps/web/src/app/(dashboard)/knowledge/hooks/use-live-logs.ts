"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL } from "@/lib/api";

export interface LogEntry {
  timestamp: string;
  step: string;
  status: string;
  message: string;
  document_id?: string;
  progress?: number;
}

export const useLiveLogs = (collectionName: string, enabled: boolean) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const clear = useCallback(() => setLogs([]), []);

  useEffect(() => {
    if (!enabled || !collectionName) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setConnected(false);
      return;
    }

    const url = `${API_URL}/v1/knowledge/collections/${encodeURIComponent(collectionName)}/events`;
    const es = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = es;

    es.addEventListener("log", (e) => {
      try {
        const data = JSON.parse(e.data);
        const entry: LogEntry = {
          document_id: data.document_id,
          message: data.message,
          progress: data.progress,
          status: data.status,
          step: data.step,
          timestamp: new Date().toISOString()
        };
        setLogs((prev) => [...prev, entry].slice(-500));
        setConnected(true);
      } catch {
        // ignore malformed events
      }
    });

    es.addEventListener("error", () => {
      setConnected(false);
    });

    es.onopen = () => {
      setConnected(true);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, [collectionName, enabled]);

  return { clear, connected, logs };
};
