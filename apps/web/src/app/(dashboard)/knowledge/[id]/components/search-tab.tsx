"use client";

import { Button, Input, Spinner } from "@raven/ui";
import { Search } from "lucide-react";
import { useState } from "react";
import { useKnowledgeSearch } from "../../hooks/use-search";

interface SearchTabProps {
  readonly collectionId: string;
}

const SearchTab = ({ collectionId }: SearchTabProps) => {
  const [query, setQuery] = useState("");
  const search = useKnowledgeSearch();

  const handleSearch = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!query.trim()) return;
    search.mutate({ collectionId, query: query.trim() });
  };

  return (
    <div className="space-y-6">
      <form className="flex gap-2" onSubmit={handleSearch}>
        <div className="flex-1">
          <Input
            autoComplete="off"
            id="knowledge-search-query"
            name="query"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search knowledge base..."
            value={query}
          />
        </div>
        <Button disabled={search.isPending || !query.trim()} type="submit">
          {search.isPending ? (
            <Spinner className="size-4" />
          ) : (
            <Search className="size-4" />
          )}
          Search
        </Button>
      </form>

      {search.isError && (
        <div
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {search.error.message}
        </div>
      )}

      {search.data && (
        <div className="space-y-3">
          {search.data.chunks.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              No results found.
            </p>
          ) : (
            search.data.chunks.map((chunk) => (
              <div
                className="rounded-xl border border-border bg-card p-4"
                key={chunk.id}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {chunk.documentTitle}
                  </span>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {Math.round(chunk.score * 100)}% match
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {chunk.content}
                </p>
                <p className="mt-2 text-xs text-muted-foreground/60">
                  Chunk #{chunk.chunkIndex + 1}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export { SearchTab };
