export const ACCOUNT_NAME_COL_W = 292;

export const ACCOUNT_COLUMNS: {
  key: string;
  label: string;
  w: number;
  /** connected-board columns get the green header underline */
  connected?: boolean;
}[] = [
  { key: "owner", label: "Owner", w: 100 },
  { key: "domain", label: "Domain", w: 189 },
  { key: "email", label: "Email", w: 200 },
  // the developer's customary downpayment rate — prefills accepted offers
  { key: "downpayment", label: "Downpayment %", w: 140 },
  { key: "industry", label: "Industry", w: 230 },
  { key: "description", label: "Description", w: 280 },
  { key: "employees", label: "No. of employees", w: 160 },
  { key: "hq", label: "Headquarters location", w: 210 },
  { key: "contacts", label: "Contacts", w: 213, connected: true },
  { key: "deals", label: "Deals", w: 181, connected: true },
];
