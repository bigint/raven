"use client";

import { Button } from "@raven/ui";
import { useState } from "react";

interface Chunk {
  readonly id: string;
  readonly chunkIndex: number;
  readonly content: string;
  readonly tokenCount: number;
}

interface ChunkViewerProps {
  readonly chunks: Chunk[];
}

const PAGE_SIZE = 20;

const ChunkViewer = ({ chunks }: ChunkViewerProps) => {
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(chunks.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const pageChunks = chunks.slice(start, start + PAGE_SIZE);

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          Chunks{" "}
          <span className="font-normal text-muted-foreground">
            ({chunks.length} total)
          </span>
        </h2>
        {totalPages > 1 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Page {page + 1} of {totalPages}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {pageChunks.map((chunk) => (
          <div className="rounded-xl border border-border p-4" key={chunk.id}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Chunk #{chunk.chunkIndex}
              </span>
              <span className="text-xs text-muted-foreground">
                {chunk.tokenCount} tokens
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm">{chunk.content}</p>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <Button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            size="sm"
            variant="secondary"
          >
            Previous
          </Button>
          <Button
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            size="sm"
            variant="secondary"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export { ChunkViewer };
