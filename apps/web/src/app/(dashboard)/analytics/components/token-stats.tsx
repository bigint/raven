"use client";

import { TextMorph } from "torph/react";
import type { Stats } from "../hooks/use-analytics";

interface TokenStatsProps {
  stats: Stats | null;
  loading: boolean;
}

interface TokenCard {
  label: string;
  value: string;
}

const buildTokenCards = (stats: Stats | null): TokenCard[] => [
  {
    label: "Total Requests",
    value: stats ? Number(stats.totalRequests).toLocaleString() : "\u2014"
  },
  {
    label: "Total Tokens",
    value: stats ? Number(stats.totalTokens).toLocaleString() : "\u2014"
  },
  {
    label: "Input Tokens",
    value: stats ? Number(stats.totalInputTokens).toLocaleString() : "\u2014"
  },
  {
    label: "Output Tokens",
    value: stats ? Number(stats.totalOutputTokens).toLocaleString() : "\u2014"
  },
  {
    label: "Cached Tokens",
    value: stats ? Number(stats.totalCachedTokens).toLocaleString() : "\u2014"
  },
  {
    label: "Reasoning Tokens",
    value: stats
      ? Number(stats.totalReasoningTokens).toLocaleString()
      : "\u2014"
  }
];

export const TokenStats = ({ stats, loading }: TokenStatsProps) => {
  const cards = buildTokenCards(stats);

  return (
    <div className="mb-8">
      <h2 className="mb-4 text-base font-semibold">Token Usage</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div className="rounded-xl border border-border p-5" key={card.label}>
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <div className="mt-3">
              {loading ? (
                <div className="h-8 w-28 animate-pulse rounded-md bg-muted" />
              ) : (
                <TextMorph className="text-3xl font-bold tabular-nums">
                  {card.value}
                </TextMorph>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
