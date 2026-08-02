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
  { key: "phone", label: "Phone", w: 170 },
  // nationality, picked separately — the dial code can't stand in for it
  { key: "country", label: "Country", w: 150 },
  { key: "gender", label: "Gender", w: 120 },
  { key: "age", label: "Age", w: 90 },
  // the client's demand, readable straight from the board instead of only in
  // the side panel — Title / Type / Priority were dropped as unusable noise
  { key: "property_type", label: "Property type", w: 150 },
  { key: "bedrooms", label: "Size", w: 110 },
  { key: "budget", label: "Budget", w: 140 },
  // Preferred area + Requirements were dropped from the board as clutter —
  // both stay editable in the contact drawer's demand section
  { key: "accounts", label: "Accounts", w: 192 },
  { key: "deals", label: "Deals", w: 181, connected: true },
  { key: "deals_value", label: "Deals value", w: 132, connected: true },
  { key: "comments", label: "Comments", w: 220 },
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
