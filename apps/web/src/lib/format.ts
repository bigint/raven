import { format, formatDistanceToNowStrict } from "date-fns";

export const formatTimeAgo = (ts: string | null): string => {
  if (!ts) return "\u2014";
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return "\u2014";
  return `${formatDistanceToNowStrict(date)} ago`;
};

export const formatShortDate = (date: string): string => {
  return format(new Date(date), "d MMM");
};

export const formatDateTime = (ts: string): string => {
  if (!ts) return "\u2014";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "\u2014";
  return format(d, "d MMM, hh:mm:ss aa");
};

export const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "\u2014";
  return format(new Date(dateStr), "MMM d, yyyy");
};

export const formatCompactNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};
