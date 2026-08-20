export const DEVELOPMENT_NAME_COL_W = 292;

export const DEVELOPMENT_COLUMNS: {
  key: string;
  label: string;
  w: number;
  /** connected-board columns get the green header underline */
  connected?: boolean;
}[] = [
  { key: "owner", label: "Owner", w: 190 },
  { key: "developer", label: "Developer", w: 192, connected: true },
  { key: "status", label: "Status", w: 170 },
  { key: "location", label: "Location", w: 180 },
  { key: "completion", label: "Completion", w: 140 },
  { key: "units", label: "Units", w: 110, connected: true },
  { key: "description", label: "Description", w: 260 },
];

export const DEVELOPMENT_STATUSES: { key: string; label: string; color: string }[] = [
  { key: "planned", label: "Planned", color: "#a25ddc" },
  { key: "under_construction", label: "Under Construction", color: "#fdab3d" },
  { key: "ready", label: "Ready", color: "#00c875" },
  { key: "handover", label: "Handover", color: "#0086c0" },
];
