export const VIEWING_NAME_COL_W = 292;

export const VIEWING_COLUMNS: {
  key: string;
  label: string;
  w: number;
  /** connected-board columns get the green header underline */
  connected?: boolean;
}[] = [
  { key: "agent", label: "Agent", w: 190 },
  { key: "contact", label: "Contact", w: 192, connected: true },
  { key: "unit", label: "Unit", w: 170, connected: true },
  { key: "start", label: "When", w: 180 },
  { key: "status", label: "Status", w: 150 },
  { key: "feedback", label: "Feedback", w: 260 },
];

export const VIEWING_STATUSES: { key: string; label: string; color: string }[] = [
  { key: "requested", label: "Requested", color: "#66ccff" },
  { key: "scheduled", label: "Scheduled", color: "#579bfc" },
  { key: "confirmed", label: "Confirmed", color: "#00a0a0" },
  { key: "completed", label: "Completed", color: "#00c875" },
  { key: "cancelled", label: "Cancelled", color: "#e2445c" },
  { key: "no_show", label: "No Show", color: "#bb3354" },
];
