import type { IconName } from "@/lib/figma-icons";
import { parseLocalDate } from "@/components/crm/activities/activities-config";

/** Column layout of the Leads main table (widths from the Figma frame). */
export const NAME_COL_W = 292;

/**
 * Exactly what the sales team captures on a lead. Score, Activities timeline,
 * Company, Title, Last interaction and Active sequences were removed on request
 * — the lead drawer still shows score and activity for anyone who wants them.
 */
export const BOARD_COLUMNS: {
  key: string;
  label: string;
  w: number;
  headerIcon?: IconName;
}[] = [
  // the board's Status: how hot the person is. The pipeline-stage column
  // that used to hold this name was dropped on request — the team never
  // worked the funnel by stage, they work it by how warm the lead is.
  // (crm_leads.stage_id is untouched and still drives the drawer's stage
  // journey and the lead score.)
  { key: "temperature", label: "Status", w: 130 },
  { key: "owner", label: "Owner", w: 98 },
  { key: "first_name", label: "First name", w: 150 },
  { key: "last_name", label: "Last name", w: 150 },
  { key: "phone", label: "Telephone", w: 170 },
  // nationality, picked separately — the dial code can't stand in for it
  { key: "country", label: "Country", w: 150 },
  { key: "gender", label: "Gender", w: 120 },
  { key: "age", label: "Age", w: 90 },
  { key: "email", label: "Email", w: 200 },
  { key: "source", label: "Lead Source", w: 160 },
  { key: "date", label: "Date", w: 130 },
  { key: "notes", label: "Text", w: 260 },
  { key: "contact", label: "Move to contact", w: 181 },
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

/** The channels leads actually arrive through, in the order they are picked. */
export const LEAD_SOURCES: { key: string; label: string; color: string }[] = [
  { key: "meta", label: "Meta", color: "#0866ff" },
  { key: "google-ads", label: "Google Ads", color: "#fdab3d" },
  { key: "dubizzle", label: "Dubizzle", color: "#e2445c" },
  { key: "co-worker", label: "Co-worker", color: "#00a0a0" },
  { key: "personal", label: "Personal", color: "#a25ddc" },
];

/** Lead source → tag color (white text). Legacy values keep a colour so old
 *  rows do not render grey-on-grey until someone re-picks their source. */
export const SOURCE_COLORS: Record<string, string> = {
  ...Object.fromEntries(LEAD_SOURCES.map((s) => [s.key, s.color])),
  manual: "#c4c4c4",
  website: "#00c875",
  ads: "#fdab3d",
  "ai-chat": "#a25ddc",
  import: "#579bfc",
  linkedin: "#61b56b",
};

export function sourceColor(source: string): string {
  return SOURCE_COLORS[source.toLowerCase()] ?? "#7f8f8f";
}

/** Display label for a stored source key (falls back to the raw value). */
export function sourceLabel(source: string): string {
  return LEAD_SOURCES.find((s) => s.key === source.toLowerCase())?.label ?? source;
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
  // a date-only column is a calendar day, not an instant — parsing it as
  // UTC would show the day before on any machine west of UTC
  const d = parseLocalDate(iso);
  if (!d) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function daysAgoLabel(iso: string | null): string | null {
  const parsed = parseLocalDate(iso);
  if (!parsed) return null;
  const days = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 86400000));
  return `${days}d ago`;
}

/** deterministic small hash for decorative timeline bars */
export function leadHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}
