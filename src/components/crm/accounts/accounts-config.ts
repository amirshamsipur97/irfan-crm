export const ACCOUNT_NAME_COL_W = 292;

/** What an Accounts row IS. Developer companies are the standard; areas and
 *  anything else are marked so the register stays readable. */
export const ACCOUNT_TYPES: { key: string; label: string; color: string }[] = [
  { key: "developer", label: "Developer", color: "#00718a" },
  { key: "area", label: "Area", color: "#a25ddc" },
  { key: "other", label: "Other", color: "#7f8f8f" },
];

export const ACCOUNT_COLUMNS: {
  key: string;
  label: string;
  w: number;
  /** connected-board columns get the green header underline */
  connected?: boolean;
}[] = [
  { key: "type", label: "Type", w: 130 },
  { key: "owner", label: "Owner", w: 190 },
  { key: "domain", label: "Domain", w: 189 },
  { key: "email", label: "Email", w: 200 },
  // the developer's customary downpayment rate — prefills accepted offers
  { key: "downpayment", label: "Downpayment %", w: 140 },
  { key: "industry", label: "Industry", w: 230 },
  { key: "description", label: "Description", w: 280 },
  { key: "employees", label: "No. of employees", w: 160 },
  { key: "hq", label: "Headquarters location", w: 210 },
  // the developer's projects, from the register or added by hand
  { key: "projects", label: "Projects", w: 240, connected: true },
  { key: "contacts", label: "Contacts", w: 213, connected: true },
  { key: "deals", label: "Deals", w: 181, connected: true },
];
