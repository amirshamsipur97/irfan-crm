export const PROJECT_NAME_COL_W = 292;

export const PROJECT_COLUMNS: {
  key: string;
  label: string;
  w: number;
  /** connected-board columns get the green header underline */
  connected?: boolean;
}[] = [
  { key: "owner", label: "Owner", w: 98 },
  { key: "status", label: "Status", w: 150 },
  { key: "timeline", label: "Timeline", w: 210 },
  { key: "priority", label: "Priority", w: 140 },
  { key: "value", label: "Project value", w: 150 },
  { key: "account", label: "Account", w: 192, connected: true },
  { key: "notes", label: "Notes", w: 260 },
];

export const PROJECT_STATUSES: { key: string; label: string; color: string }[] = [
  { key: "planning", label: "Planning", color: "#a25ddc" },
  { key: "in_progress", label: "In Progress", color: "#fdab3d" },
  { key: "done", label: "Done", color: "#00c875" },
  { key: "stuck", label: "Stuck", color: "#e2445c" },
];

export const PROJECT_PRIORITIES: { key: string; label: string; color: string }[] = [
  { key: "high", label: "High", color: "#ff642e" },
  { key: "medium", label: "Medium", color: "#fdab3d" },
  { key: "low", label: "Low", color: "#579bfc" },
];

/** "Jul 6 – Aug 14" label for the timeline pill */
export function rangeLabel(start: string | null, end: string | null): string {
  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `${fmt(start)} –`;
  if (end) return `– ${fmt(end)}`;
  return "";
}
