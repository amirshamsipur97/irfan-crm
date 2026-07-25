export const CONTACT_NAME_COL_W = 292;

export const CONTACT_COLUMNS: {
  key: string;
  label: string;
  w: number;
  /** connected-board columns get the green header underline */
  connected?: boolean;
}[] = [
  { key: "owner", label: "Owner", w: 100 },
  { key: "email", label: "Email", w: 189 },
  { key: "timeline", label: "Activities timeline", w: 194 },
  { key: "accounts", label: "Accounts", w: 192 },
  { key: "deals", label: "Deals", w: 181, connected: true },
  { key: "deals_value", label: "Deals value", w: 132, connected: true },
  { key: "phone", label: "Phone", w: 170 },
  { key: "title", label: "Title", w: 140 },
  { key: "type", label: "Type", w: 140 },
  { key: "priority", label: "Priority", w: 140 },
  { key: "comments", label: "Comments", w: 260 },
];

export const CONTACT_TYPES: { key: string; label: string; color: string }[] = [
  { key: "customer", label: "Customer", color: "#66ccff" },
  { key: "partner", label: "Partner", color: "#fdab3d" },
  { key: "prospect", label: "Prospect", color: "#a25ddc" },
  { key: "vendor", label: "Vendor", color: "#00a0a0" },
];

export const CONTACT_PRIORITIES: { key: string; label: string; color: string }[] = [
  { key: "high", label: "High", color: "#ff642e" },
  { key: "medium", label: "Medium", color: "#fdab3d" },
  { key: "low", label: "Low", color: "#579bfc" },
];

/** green underline color for connected-board column headers */
export const CONNECTED_UNDERLINE = "#037f4c";
