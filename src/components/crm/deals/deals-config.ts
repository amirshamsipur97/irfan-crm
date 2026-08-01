import type { ForecastCategory } from "@/lib/types";

export const DEAL_NAME_COL_W = 292;

/**
 * A row is one sales offer to a contact. The `client_*` columns are mirrored
 * live from the linked contact's demand — they are read-only here so the two
 * sides can never disagree — and sit next to what we are actually offering, so
 * an agent can see at a glance whether the offer fits the budget.
 */
export const DEAL_COLUMNS: { key: string; label: string; w: number }[] = [
  { key: "stage", label: "Stage", w: 159 },
  { key: "owner", label: "Owner", w: 98 },
  { key: "contacts", label: "Client", w: 200 },
  { key: "client_demand", label: "Client wants", w: 170 },
  { key: "client_budget", label: "Client budget", w: 140 },
  // stock rotates weekly and is shared with other agencies, so an offer is
  // pinned to the developer and the kind of unit, never to a specific unit
  { key: "accounts", label: "Developer", w: 200 },
  { key: "offer_property_type", label: "Offer type", w: 150 },
  { key: "offer_bedrooms", label: "Offer size", w: 110 },
  { key: "value", label: "Offer price", w: 140 },
  { key: "vs_budget", label: "vs budget", w: 130 },
  { key: "close_date", label: "Expected Close Date", w: 180 },
  { key: "offer_details", label: "Offer details", w: 240 },
  // acceptance: the offer becomes a deal and its downpayment is tracked there
  { key: "move", label: "Move to deal", w: 150 },
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

/**
 * Short form for narrow cells: "3.2M OMR" instead of "3,200,000 OMR".
 * Board columns are a fixed width, so a full figure wraps to a second line and
 * spills into the row below — always pair this with the exact value in a title.
 */
export function compactMoney(value: number | null | undefined, currency = "OMR"): string {
  const n = value == null ? 0 : Number(value);
  return `${new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n)} ${currency}`;
}

/** Monday computes forecast value as deal value × close probability. */
export function forecastValue(value: number | null, probability: number | null): number {
  if (!value || probability == null) return 0;
  return Math.round(Number(value) * (probability / 100));
}
