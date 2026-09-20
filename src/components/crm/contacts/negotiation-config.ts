/**
 * The first negotiation, as the agents actually run it.
 *
 * It used to be one blank textarea, so the same call was written down five
 * different ways and nothing could be counted. These are the questions asked on
 * every first call — how the client reached us, whether they are already here,
 * why they are buying, whether we hold something that fits, and when they want
 * the keys — kept as keys so the answers stay comparable between agents. The
 * free note survives for everything the options cannot hold.
 *
 * ONE list per concept: the popup, the board cell and the contact drawer all
 * read these.
 */

/** `short` is what the 220px board cell shows — the full label is the dropdown's. */
export const NEGOTIATION_CHANNELS: { key: string; label: string; short: string; color: string }[] = [
  { key: "call", label: "Phone call", short: "Call", color: "#0086c0" },
  { key: "whatsapp", label: "WhatsApp message", short: "WhatsApp", color: "#00c875" },
  { key: "email", label: "Email", short: "Email", color: "#579bfc" },
  { key: "in_person", label: "In person", short: "In person", color: "#a25ddc" },
];

export const NEGOTIATION_PURPOSES: { key: string; label: string; color: string }[] = [
  { key: "residency", label: "Residency", color: "#00a0a0" },
  { key: "investment", label: "Investment", color: "#fdab3d" },
  { key: "living", label: "Living in Oman", color: "#00c875" },
  { key: "other", label: "Other", color: "#9aadbd" },
];

/** When the client wants the keys — the market's two answers. */
export const NEGOTIATION_READINESS: { key: string; label: string; color: string }[] = [
  { key: "ready", label: "Ready to move", color: "#00c875" },
  { key: "off_plan", label: "Off-plan", color: "#579bfc" },
];

export const YES_NO: { key: string; label: string; color: string }[] = [
  { key: "yes", label: "Yes", color: "#00c875" },
  { key: "no", label: "No", color: "#e2445c" },
];

/** An unanswered question stays null; an unknown key is shown as it was stored. */
function label(list: { key: string; label: string }[], key: string | null | undefined): string | null {
  if (!key) return null;
  return list.find((o) => o.key === key)?.label ?? key;
}

/** A boolean column reads back as a yes/no option key, and null stays unanswered. */
export function boolKey(value: boolean | null | undefined): string | null {
  if (value === true) return "yes";
  if (value === false) return "no";
  return null;
}

export function keyBool(key: string | null): boolean | null {
  if (key === "yes") return true;
  if (key === "no") return false;
  return null;
}

/** What the popup holds, in the shape the contact row stores it. */
export interface NegotiationValue {
  first_negotiation_at: string | null;
  negotiation_channel: string | null;
  negotiation_resident: boolean | null;
  negotiation_purpose: string | null;
  negotiation_purpose_other: string | null;
  negotiation_has_offer: boolean | null;
  negotiation_alt_project: string | null;
  negotiation_alt_project_id: string | null;
  negotiation_readiness: string | null;
  first_negotiation_note: string | null;
}

/**
 * The one-line summary the 220px board cell shows. The note is not part of it:
 * a sentence would push every answer out of view, and the cell's tooltip plus
 * the popup carry the full text.
 */
export function negotiationSummary(v: {
  negotiation_channel?: string | null;
  negotiation_resident?: boolean | null;
  negotiation_purpose?: string | null;
  negotiation_purpose_other?: string | null;
  negotiation_readiness?: string | null;
  negotiation_has_offer?: boolean | null;
  negotiation_alt_project?: string | null;
}): string[] {
  const out: string[] = [];
  const channel = v.negotiation_channel
    ? (NEGOTIATION_CHANNELS.find((c) => c.key === v.negotiation_channel)?.short ?? v.negotiation_channel)
    : null;
  if (channel) out.push(channel);
  if (v.negotiation_resident === true) out.push("In Oman");
  else if (v.negotiation_resident === false) out.push("Abroad");
  const purpose =
    v.negotiation_purpose === "other"
      ? v.negotiation_purpose_other?.trim() || "Other"
      : label(NEGOTIATION_PURPOSES, v.negotiation_purpose);
  if (purpose) out.push(purpose);
  const readiness = label(NEGOTIATION_READINESS, v.negotiation_readiness);
  if (readiness) out.push(readiness);
  if (v.negotiation_has_offer === true) out.push("Offer ready");
  else if (v.negotiation_has_offer === false)
    out.push(v.negotiation_alt_project ? `Instead: ${v.negotiation_alt_project}` : "No match");
  return out;
}

/** How many of the six questions have an answer — the popup's progress line. */
export function answeredCount(v: {
  negotiation_channel?: string | null;
  negotiation_resident?: boolean | null;
  negotiation_purpose?: string | null;
  negotiation_has_offer?: boolean | null;
  negotiation_readiness?: string | null;
  first_negotiation_note?: string | null;
}): number {
  let n = 0;
  if (v.negotiation_channel) n += 1;
  if (v.negotiation_resident != null) n += 1;
  if (v.negotiation_purpose) n += 1;
  if (v.negotiation_has_offer != null) n += 1;
  if (v.negotiation_readiness) n += 1;
  if (v.first_negotiation_note?.trim()) n += 1;
  return n;
}

export const NEGOTIATION_QUESTIONS = 6;
