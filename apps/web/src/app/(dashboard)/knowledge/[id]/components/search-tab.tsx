"use client";

import { Button, Input, Spinner } from "@raven/ui";
import { Search } from "lucide-react";
import { useState } from "react";
import { useKnowledgeSearch } from "../../hooks/use-search";

const highlightTerms = (text: string, query: string): React.ReactNode => {
  const words = query
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (words.length === 0) return text;

  const pattern = new RegExp(`(${words.join("|")})`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, i) =>
    pattern.test(part) ? (
      <mark className="rounded-sm bg-primary/20 px-0.5 text-foreground" key={i}>
        {part}
      </mark>
    ) : (
      part
    )
  );
};

interface SearchTabProps {
  readonly collectionId: string;
}

const SearchTab = ({ collectionId }: SearchTabProps) => {
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const search = useKnowledgeSearch();

  const handleSearch = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchedQuery(query.trim());
    search.mutate({ collectionName: collectionId, query: query.trim() });
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
          {search.data.results.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              No results found.
            </p>
          ) : (
            search.data.results.map((result) => (
              <div
                className="rounded-xl border border-border bg-card p-4"
                key={result.id}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {Math.round(result.score * 100)}% match
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {highlightTerms(result.text, searchedQuery)}
                </p>
                {result.chunk_index !== null && (
                  <p className="mt-2 text-xs text-muted-foreground/60">
                    Chunk #{result.chunk_index + 1}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export { SearchTab };
