import type { IconName } from "@/lib/figma-icons";

/** Column layout of the Leads main table (widths from the Figma frame). */
export const NAME_COL_W = 292;

export const BOARD_COLUMNS: {
  key: string;
  label: string;
  w: number;
  headerIcon?: IconName;
}[] = [
  { key: "status", label: "Status", w: 140 },
  { key: "owner", label: "Owner", w: 98 },
  { key: "timeline", label: "Activities timeline", w: 152, headerIcon: "tlHeader" },
  { key: "contact", label: "Create a contact", w: 181 },
  { key: "company", label: "Company", w: 140 },
  { key: "title", label: "Title", w: 140 },
  { key: "email", label: "Email", w: 189 },
  { key: "phone", label: "Phone", w: 160 },
  { key: "source", label: "Lead Source", w: 150 },
  { key: "last", label: "Last interaction", w: 150 },
  { key: "seq", label: "Active sequences", w: 170 },
];

export const TABLE_W = NAME_COL_W + BOARD_COLUMNS.reduce((s, c) => s + c.w, 0) + 40;

/** Monday group color palette for new groups. */
export const GROUP_COLORS = [
  "#579bfc",
  "#00c875",
  "#fdab3d",
  "#a25ddc",
  "#e2445c",
  "#00a0a0",
  "#ff642e",
  "#66ccff",
];

/** Lead source → tag color (white text). */
export const SOURCE_COLORS: Record<string, string> = {
  manual: "#c4c4c4",
  website: "#00c875",
  ads: "#fdab3d",
  "google-ads": "#fdab3d",
  "ai-chat": "#a25ddc",
  import: "#579bfc",
  linkedin: "#61b56b",
};

export function sourceColor(source: string): string {
  return SOURCE_COLORS[source.toLowerCase()] ?? "#7f8f8f";
}

const DIAL_FLAGS: Record<string, string> = {
  "+1": "🇺🇸",
  "+7": "🇷🇺",
  "+44": "🇬🇧",
  "+49": "🇩🇪",
  "+90": "🇹🇷",
  "+91": "🇮🇳",
  "+98": "🇮🇷",
  "+966": "🇸🇦",
  "+968": "🇴🇲",
  "+971": "🇦🇪",
  "+974": "🇶🇦",
  "+965": "🇰🇼",
  "+973": "🇧🇭",
};

export function dialFlag(code: string | null): string | null {
  if (!code) return null;
  return DIAL_FLAGS[code.trim()] ?? null;
}

export function shortDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function daysAgoLabel(iso: string | null): string | null {
  if (!iso) return null;
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
  return `${days}d ago`;
}

/** deterministic small hash for decorative timeline bars */
export function leadHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}
