import type { ItemHeight } from "@/components/crm/leads/BoardHeader";

export const ACTIVITY_NAME_COL_W = 292;

/** Row heights for the "…" menu Item height setting (Single / Double / Triple). */
export const ROW_HEIGHTS: Record<ItemHeight, number> = {
  single: 36,
  double: 60,
  triple: 84,
};

export const ACTIVITY_COLUMNS: { key: string; label: string; w: number }[] = [
  { key: "owner", label: "Owner", w: 190 },
  { key: "type", label: "Activity Type", w: 168 },
  { key: "start", label: "Start time", w: 200 },
  { key: "end", label: "End time", w: 200 },
  { key: "status", label: "Status", w: 165 },
  { key: "related", label: "Related item", w: 210 },
];

export const ACTIVITY_TYPES: { key: string; label: string; color: string }[] = [
  { key: "call_summary", label: "Call summary", color: "#fdab3d" },
  { key: "meeting", label: "Meeting", color: "#579bfc" },
  { key: "email", label: "Email", color: "#a25ddc" },
  { key: "note", label: "Note", color: "#00a0a0" },
];

export const ACTIVITY_STATUSES: { key: string; label: string; color: string }[] = [
  { key: "done", label: "Done", color: "#9cd326" },
  { key: "scheduled", label: "Scheduled", color: "#579bfc" },
  { key: "canceled", label: "Canceled", color: "#e2445c" },
];

/** "Jun 30, 7:00 PM" formatting for start/end time cells */
export function activityTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date}, ${time}`;
}

/**
 * Parse a stored value into the day the agent MEANT.
 *
 * `new Date("2026-08-20")` is defined to parse as UTC midnight, so a
 * date-only column read back on a machine west of UTC lands on the 19th —
 * the cell shows the wrong day, the calendar highlights the wrong day, and
 * the "correction" the agent then makes reads as a day out to everyone
 * else. Date-only strings are therefore built as LOCAL midnight here;
 * real timestamps (which carry a zone) are parsed normally.
 */
export function parseLocalDate(value: string | null): Date | null {
  if (!value) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * LOCAL calendar date (YYYY-MM-DD) from an ISO timestamp — for date-only
 * columns. Never slice(0,10) the raw ISO: it is UTC and shifts a day for
 * timezones ahead of UTC (Oman +04).
 */
export function toLocalDateString(iso: string | null): string | null {
  const d = parseLocalDate(iso);
  if (!d) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today as YYYY-MM-DD in the viewer's own timezone. */
export function todayLocalDateString(): string {
  return toLocalDateString(new Date().toISOString()) as string;
}

/** value for <input type="datetime-local"> from an ISO timestamp */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
