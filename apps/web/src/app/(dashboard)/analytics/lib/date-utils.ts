export type DateRange = "7d" | "30d" | "90d";

export type ExtendedDateRange = DateRange | "custom";

export const RANGE_MS: Record<DateRange, number> = {
  "7d": 604_800_000,
  "30d": 2_592_000_000,
  "90d": 7_776_000_000
};

export const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" }
];

export const EXTENDED_DATE_RANGE_OPTIONS: {
  value: ExtendedDateRange;
  label: string;
}[] = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "Custom", value: "custom" }
];

export const VALID_RANGES: DateRange[] = ["7d", "30d", "90d"];

export const EXTENDED_VALID_RANGES: ExtendedDateRange[] = [
  "7d",
  "30d",
  "90d",
  "custom"
];

export const rangeToFrom = (range: DateRange): string =>
  new Date(Date.now() - RANGE_MS[range]).toISOString();

export const extendedRangeToFrom = (range: string): string => {
  const ms = RANGE_MS[range as DateRange] ?? 2_592_000_000;
  return new Date(Date.now() - ms).toISOString();
};

export const keyFilter = (keyId?: string): string =>
  keyId ? `&virtualKeyId=${keyId}` : "";

export const fillTimeSeriesGaps = <T extends { date: string }>(
  data: T[],
  range: DateRange,
  defaultEntry: (date: string) => T
): T[] => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const from = new Date(Date.now() - RANGE_MS[range]);
  from.setHours(0, 0, 0, 0);

  const dataMap = new Map(data.map((d) => [d.date, d]));
  const result: T[] = [];
  const current = new Date(from);

  while (current <= now) {
    const key = current.toISOString().slice(0, 10);
    result.push(dataMap.get(key) ?? defaultEntry(key));
    current.setDate(current.getDate() + 1);
  }

  return result;
};
