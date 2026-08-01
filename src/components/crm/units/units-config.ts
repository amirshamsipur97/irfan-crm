export const UNIT_NAME_COL_W = 292;

export const UNIT_COLUMNS: {
  key: string;
  label: string;
  w: number;
  /** connected-board columns get the green header underline */
  connected?: boolean;
}[] = [
  { key: "development", label: "Development", w: 192, connected: true },
  { key: "unit_type", label: "Type", w: 140 },
  { key: "bedrooms", label: "Bedrooms", w: 100 },
  { key: "area", label: "Area", w: 110 },
  { key: "price", label: "Price", w: 140 },
  { key: "status", label: "Status", w: 150 },
  { key: "owner", label: "Owner", w: 98 },
  { key: "handover", label: "Handover", w: 130 },
];

/**
 * One list, shared with the client's demand and the sales offer — see
 * PROPERTY_TYPES in contacts/demand-config.ts. This used to be a second,
 * slightly different list ("Retail" here against "Shop" there), which would
 * have made any demand-to-stock matching quietly wrong.
 */
export { PROPERTY_TYPES as UNIT_TYPES } from "@/components/crm/contacts/demand-config";

/**
 * Unit availability statuses. "Reserved" and "Contracted" are normally set by
 * the reservations workflow (DB trigger) — manual overrides are audit-logged.
 */
export const UNIT_STATUSES: { key: string; label: string; color: string }[] = [
  { key: "available", label: "Available", color: "#00c875" },
  { key: "held", label: "Held", color: "#fdab3d" },
  { key: "reserved", label: "Reserved", color: "#784bd1" },
  { key: "contracted", label: "Contracted", color: "#0086c0" },
  { key: "sold", label: "Sold", color: "#676879" },
  { key: "withdrawn", label: "Withdrawn", color: "#e2445c" },
];
