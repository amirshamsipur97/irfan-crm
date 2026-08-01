/** What the client is looking for — the Demand side of a converted lead. */

/**
 * The single property-type list for the whole CRM — the client's demand, the
 * sales offer on a deal, and the Units board all read it, so a demand can
 * actually be matched against stock.
 *
 * Drawn from the 407 real units in the irfaninvest.com register rather than
 * invented: Apartment dominates, then Villa / Sky Villa / Studio / Sky
 * Residence, with a tail of Penthouse, Duplex, Farm House, Chalet, Townhouse,
 * Twin Villa and Sky Palace. Office / Shop / Land are kept for commercial
 * enquiries even though the residential register has none.
 */
export const PROPERTY_TYPES: { key: string; label: string; color: string }[] = [
  { key: "apartment", label: "Apartment", color: "#579bfc" },
  { key: "villa", label: "Villa", color: "#00c875" },
  { key: "twin_villa", label: "Twin Villa", color: "#61b56b" },
  { key: "sky_villa", label: "Sky Villa", color: "#0086c0" },
  { key: "sky_residence", label: "Sky Residence", color: "#66ccff" },
  { key: "sky_palace", label: "Sky Palace", color: "#784bd1" },
  { key: "townhouse", label: "Townhouse", color: "#00a0a0" },
  { key: "penthouse", label: "Penthouse", color: "#a25ddc" },
  { key: "duplex", label: "Duplex", color: "#e2a1f5" },
  { key: "studio", label: "Studio", color: "#9aadbd" },
  { key: "chalet", label: "Chalet", color: "#ffcb00" },
  { key: "farm_house", label: "Farm House", color: "#7f5347" },
  { key: "office", label: "Office", color: "#fdab3d" },
  { key: "shop", label: "Shop", color: "#ff642e" },
  { key: "land", label: "Land", color: "#7f8f8f" },
];

/** Unit size, written the way the market says it. */
export const BEDROOM_OPTIONS: { key: string; label: string; color: string }[] = [
  { key: "studio", label: "Studio", color: "#66ccff" },
  { key: "1bhk", label: "1BHK", color: "#579bfc" },
  { key: "2bhk", label: "2BHK", color: "#00a0a0" },
  { key: "3bhk", label: "3BHK", color: "#00c875" },
  { key: "4bhk", label: "4BHK", color: "#fdab3d" },
  { key: "5bhk+", label: "5BHK+", color: "#a25ddc" },
];

export const DOC_TYPES: { key: string; label: string }[] = [
  { key: "passport", label: "Passport" },
  { key: "id", label: "ID card" },
  { key: "visa", label: "Visa / residency" },
  { key: "contract", label: "Contract" },
  { key: "other", label: "Other" },
];

export function propertyTypeLabel(key: string | null): string {
  if (!key) return "—";
  return PROPERTY_TYPES.find((p) => p.key === key)?.label ?? key;
}

export function bedroomLabel(key: string | null): string {
  if (!key) return "—";
  return BEDROOM_OPTIONS.find((b) => b.key === key)?.label ?? key;
}

/** 25 MB, matching the storage bucket's own limit. */
export const MAX_DOC_BYTES = 25 * 1024 * 1024;

export function humanSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
