export const PRODUCT_NAME_COL_W = 292;

export const PRODUCT_COLUMNS: {
  key: string;
  label: string;
  w: number;
  /** connected-board columns get the green header underline */
  connected?: boolean;
}[] = [
  { key: "owner", label: "Owner", w: 98 },
  { key: "status", label: "Status", w: 150 },
  { key: "price", label: "Price", w: 150 },
  { key: "billing", label: "Billing", w: 140 },
  { key: "sku", label: "SKU", w: 140 },
  { key: "description", label: "Description", w: 280 },
];

export const PRODUCT_STATUSES: { key: string; label: string; color: string }[] = [
  { key: "active", label: "Active", color: "#00c875" },
  { key: "draft", label: "Draft", color: "#fdab3d" },
  { key: "discontinued", label: "Discontinued", color: "#e2445c" },
];

export const PRODUCT_BILLING: { key: string; label: string; color: string }[] = [
  { key: "one_time", label: "One-time", color: "#579bfc" },
  { key: "monthly", label: "Monthly", color: "#00a0a0" },
  { key: "yearly", label: "Yearly", color: "#a25ddc" },
];
