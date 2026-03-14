"use client";

import {
  CAPABILITY_LABELS,
  MODEL_CATEGORIES,
  type ModelCategory,
  type ModelDefinition
} from "@raven/types";
import { Badge, Select } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import {
  Brain,
  DollarSign,
  Eye,
  MessageSquare,
  Search,
  Sparkles,
  Wrench,
  Zap
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ModelIcon } from "@/components/model-icon";
import { api } from "@/lib/api";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";

const CAPABILITY_ICONS: Record<string, typeof MessageSquare> = {
  chat: MessageSquare,
  embedding: Sparkles,
  function_calling: Wrench,
  reasoning: Brain,
  streaming: Zap,
  vision: Eye
};

const CATEGORY_COLORS: Record<ModelCategory, string> = {
  balanced: "info",
  embedding: "neutral",
  fast: "success",
  flagship: "primary",
  reasoning: "warning"
};

const formatContext = (tokens: number): string => {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(0)}M`;
  return `${(tokens / 1_000).toFixed(0)}K`;
};

const formatPrice = (price: number): string => {
  if (price === 0) return "—";
  if (price < 0.1) return `$${price.toFixed(3)}`;
  if (price < 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(2)}`;
};

const CATEGORY_OPTIONS: { value: ModelCategory | "all"; label: string }[] = [
  { label: "All", value: "all" },
  { label: "Flagship", value: "flagship" },
  { label: "Balanced", value: "balanced" },
  { label: "Fast", value: "fast" },
  { label: "Reasoning", value: "reasoning" },
  { label: "Embedding", value: "embedding" }
];

const formatProviderName = (slug: string): string => {
  const names: Record<string, string> = {
    anthropic: "Anthropic",
    mistralai: "Mistral AI",
    openai: "OpenAI",
    "x-ai": "xAI"
  };
  return names[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
};

const ModelCard = ({ model }: { model: ModelDefinition }) => {
  const categoryMeta = MODEL_CATEGORIES[model.category];

  return (
    <div className="group rounded-xl border border-border p-5 transition-colors hover:border-foreground/20">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
            <ModelIcon
              className="shrink-0"
              model={model.id}
              provider={model.provider}
              size={20}
            />
          </div>
          <div>
            <h3 className="font-semibold">{model.name}</h3>
            <p className="text-xs capitalize text-muted-foreground">
              {model.provider}
            </p>
          </div>
        </div>
        <Badge
          variant={
            CATEGORY_COLORS[model.category] as
              | "info"
              | "neutral"
              | "primary"
              | "success"
              | "warning"
          }
        >
          {categoryMeta.label}
        </Badge>
      </div>

      <p
        className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground"
        title={model.description}
      >
        {model.description}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Context
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums">
            {formatContext(model.contextWindow)}
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Input
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums">
            {formatPrice(model.inputPrice)}
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Output
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums">
            {formatPrice(model.outputPrice)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {model.capabilities.map((cap) => {
          const Icon = CAPABILITY_ICONS[cap];
          return (
            <span
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              key={cap}
            >
              {Icon && <Icon className="size-3" />}
              {CAPABILITY_LABELS[cap] ?? cap}
            </span>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
        <DollarSign className="size-3" />
        <span className="tabular-nums">
          {formatPrice(model.inputPrice)} input /{" "}
          {formatPrice(model.outputPrice)} output per 1M tokens
        </span>
      </div>
    </div>
  );
};

export const ModelCatalog = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ModelCategory | "all">("all");
  const [provider, setProvider] = useState("all");
  const [visibleCount, setVisibleCount] = useState(24);

  const { data: models = [], isPending } = useQuery({
    queryFn: () => api.get<ModelDefinition[]>("/v1/models"),
    queryKey: ["models", "catalog"]
  });

  const providerOptions = useMemo(() => {
    const slugs = [...new Set(models.map((m) => m.provider))].sort();
    return [
      { label: "All Providers", value: "all" },
      ...slugs.map((s) => ({ label: formatProviderName(s), value: s }))
    ];
  }, [models]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return models.filter((m) => {
      if (category !== "all" && m.category !== category) return false;
      if (provider !== "all" && m.provider !== provider) return false;
      if (query) {
        return (
          m.name.toLowerCase().includes(query) ||
          m.id.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query) ||
          m.provider.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [search, category, provider, models]);

  useEffect(() => {
    setVisibleCount(24);
  }, [search, category, provider]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => prev + 24);
  }, []);

  const sentinelRef = useInfiniteScroll(loadMore, hasMore);

  if (isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            className="h-64 animate-pulse rounded-xl border border-border bg-muted/50"
            key={i}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/30"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models by name, ID, or description..."
            type="text"
            value={search}
          />
        </div>

        <div className="flex gap-2">
          <Select
            className="w-40"
            onChange={setProvider}
            options={providerOptions}
            value={provider}
          />
          <Select
            className="w-36"
            onChange={(v) => setCategory(v as ModelCategory | "all")}
            options={CATEGORY_OPTIONS}
            value={category}
          />
        </div>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        {filtered.length} model{filtered.length === 1 ? "" : "s"}
        {category !== "all" || provider !== "all" || search
          ? " matching filters"
          : " available"}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border p-12 text-center">
          <Search className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No models found matching your search.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((model) => (
            <ModelCard key={model.id} model={model} />
          ))}
        </div>
      )}

      {hasMore && <div ref={sentinelRef} className="h-px" />}
    </div>
  );
};
