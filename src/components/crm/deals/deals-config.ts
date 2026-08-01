import type { ForecastCategory } from "@/lib/types";

export const DEAL_NAME_COL_W = 292;

export const DEAL_COLUMNS: { key: string; label: string; w: number }[] = [
  { key: "stage", label: "Stage", w: 159 },
  { key: "owner", label: "Owner", w: 98 },
  { key: "value", label: "Deal Value", w: 132 },
  { key: "contacts", label: "Contacts", w: 213 },
  { key: "accounts", label: "Accounts", w: 192 },
  { key: "close_date", label: "Expected Close Date", w: 180 },
  { key: "probability", label: "Close Probability", w: 150 },
  { key: "forecast", label: "Forecast Value", w: 150 },
  { key: "last", label: "Last interaction", w: 150 },
  { key: "quotes", label: "Quotes & Invoices", w: 160 },
  { key: "category", label: "Forecast categories", w: 180 },
];

export const FORECAST_CATEGORIES: {
  key: ForecastCategory;
  label: string;
  color: string;
}[] = [
  { key: "best_case", label: "Best case", color: "#00d2d2" },
  { key: "commit", label: "Commit", color: "#579bfc" },
  { key: "pipeline", label: "Pipeline", color: "#a25ddc" },
];

export function categoryMeta(key: ForecastCategory | null) {
  return FORECAST_CATEGORIES.find((c) => c.key === key) ?? null;
}

/** Default currency is OMR (Phase-1 decision); rows may override via their currency column. */
export function money(value: number | null | undefined, currency = "OMR"): string {
  const n = value == null ? 0 : Number(value);
  return `${n.toLocaleString("en-US")} ${currency}`;
}

/** Monday computes forecast value as deal value × close probability. */
export function forecastValue(value: number | null, probability: number | null): number {
  if (!value || probability == null) return 0;
  return Math.round(Number(value) * (probability / 100));
}
