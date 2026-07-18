import type { ItemHeight } from "@/components/crm/leads/BoardHeader";

export const ACTIVITY_NAME_COL_W = 292;

/** Row heights for the "…" menu Item height setting (Single / Double / Triple). */
export const ROW_HEIGHTS: Record<ItemHeight, number> = {
  single: 36,
  double: 60,
  triple: 84,
};

export const ACTIVITY_COLUMNS: { key: string; label: string; w: number }[] = [
  { key: "owner", label: "Owner", w: 98 },
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

/** value for <input type="datetime-local"> from an ISO timestamp */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
