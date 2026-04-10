"use client";

import { Modal } from "@raven/ui";
import {
  Check,
  Circle,
  Cloud,
  Cpu,
  Download,
  FileText,
  Loader,
  type LucideIcon,
  MinusCircle,
  RefreshCw,
  Scissors,
  Search,
  X
} from "lucide-react";
import { useEffect, useRef } from "react";
import type { LogEntry } from "../../hooks/use-live-logs";

const STEP_STYLE: Record<string, { color: string; Icon: LucideIcon }> = {
  chunked: { color: "text-cyan-400", Icon: Scissors },
  complete: { color: "text-emerald-400", Icon: Check },
  connected: { color: "text-zinc-500", Icon: Circle },
  converted: { color: "text-amber-400", Icon: FileText },
  converting: { color: "text-amber-400", Icon: Loader },
  embedding: { color: "text-violet-400", Icon: Cpu },
  error: { color: "text-red-400", Icon: X },
  failed: { color: "text-red-400", Icon: X },
  model_loaded: { color: "text-violet-400", Icon: Cpu },
  processing: { color: "text-amber-400", Icon: Loader },
  queued: { color: "text-zinc-400", Icon: Circle },
  retrying: { color: "text-amber-400", Icon: RefreshCw },
  s3_cancelled: { color: "text-red-400", Icon: X },
  s3_complete: { color: "text-emerald-400", Icon: Check },
  s3_failed: { color: "text-red-400", Icon: X },
  s3_ingested: { color: "text-emerald-400", Icon: Download },
  s3_listing: { color: "text-blue-400", Icon: Search },
  s3_skipped: { color: "text-zinc-500", Icon: MinusCircle },
  s3_started: { color: "text-blue-400", Icon: Cloud },
  search: { color: "text-sky-400", Icon: Search },
  search_complete: { color: "text-sky-400", Icon: Check },
  text_extracted: { color: "text-amber-400", Icon: FileText }
};

const DEFAULT_STYLE = { color: "text-zinc-400", Icon: Circle };

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour12: false });
};

const formatStep = (step: string) =>
  step
    .replace("s3_", "s3:")
    .replace("text_extracted", "extracted")
    .replace("model_loaded", "model");

const LogLine = ({ entry }: { readonly entry: LogEntry }) => {
  const { Icon, color } = STEP_STYLE[entry.step] ?? DEFAULT_STYLE;
  const isComplete = entry.status === "complete";
  const isFailed = entry.status === "failed";
  const docShort = entry.document_id
    ? entry.document_id.startsWith("s3:")
      ? ""
      : entry.document_id.slice(0, 8)
    : "";

  return (
    <div
      className={`group flex items-center gap-0 border-b border-zinc-900/50 py-[3px] transition-colors hover:bg-zinc-900/40 ${isFailed ? "bg-red-950/20" : ""} ${isComplete ? "bg-emerald-950/10" : ""}`}
    >
      <span className="w-[72px] shrink-0 select-none text-zinc-600">
        {formatTime(entry.timestamp)}
      </span>
      <span className={`w-5 shrink-0 ${color}`} title={entry.step}>
        <Icon className="size-3" />
      </span>
      <span className={`w-[104px] shrink-0 ${color} opacity-70`}>
        {formatStep(entry.step)}
      </span>
      {docShort && (
        <span
          className="w-[72px] shrink-0 text-zinc-600"
          title={entry.document_id}
        >
          {docShort}
        </span>
      )}
      <span
        className={`flex-1 ${isFailed ? "text-red-300" : isComplete ? "text-emerald-300" : "text-zinc-300"}`}
      >
        {entry.message}
      </span>
      {typeof entry.progress === "number" &&
        entry.progress > 0 &&
        entry.progress < 1 && (
          <span className="ml-2 shrink-0 tabular-nums text-zinc-600">
            {Math.round(entry.progress * 100)}%
          </span>
        )}
    </div>
  );
};

interface LiveLogsModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly logs: LogEntry[];
  readonly connected: boolean;
  readonly onClear: () => void;
}

const LiveLogsModal = ({
  open,
  onClose,
  logs,
  connected,
  onClear
}: LiveLogsModalProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  const errorCount = logs.filter((l) => l.status === "failed").length;

  return (
    <Modal onClose={onClose} open={open} size="xl" title="Live Logs">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span
                className={`size-2 rounded-full ${connected ? "animate-pulse bg-emerald-500" : "bg-zinc-600"}`}
              />
              <span className="text-muted-foreground">
                {connected ? "Live" : "Disconnected"}
              </span>
            </div>
            <span className="text-zinc-600">|</span>
            <span className="tabular-nums text-muted-foreground">
              {logs.length} events
            </span>
            {errorCount > 0 && (
              <>
                <span className="text-zinc-600">|</span>
                <span className="tabular-nums text-red-400">
                  {errorCount} errors
                </span>
              </>
            )}
          </div>
          {logs.length > 0 && (
            <button
              className="rounded px-2 py-0.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              onClick={onClear}
              type="button"
            >
              Clear
            </button>
          )}
        </div>

        <div className="h-[calc(100vh-16rem)] overflow-y-auto rounded-lg border border-zinc-800 bg-[#0a0a0a] px-3 py-2 font-mono text-[11px] leading-relaxed shadow-inner">
          {logs.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-700">
              <Loader className="size-5 animate-spin" />
              <span>Waiting for events...</span>
              <span className="text-[10px] text-zinc-800">
                Upload a document or start an S3 import to see live activity
              </span>
            </div>
          ) : (
            logs.map((entry, i) => (
              <LogLine entry={entry} key={`${entry.timestamp}-${i}`} />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </Modal>
  );
};

export { LiveLogsModal };
