/**
 * The admin lead report: every lead in a date window, followed from the day it
 * came in to the deal it became.
 *
 * One journey per lead, five steps, each dated:
 *
 *   Lead  →  Contact  →  Offer  →  Deal (accepted)  →  Done (downpayment in)
 *
 * The window is the lead's ENTRY day (`lead_date`, which every live lead has).
 * The agent is whoever entered the lead (`created_by`); the owner is carried
 * alongside because the two differ on a handful of reassigned rows.
 *
 * Pure functions only: the board hands in the rows it is showing, the server
 * action hands in the contacts and offers, and the same journeys feed both the
 * numbers in the Filter panel and the Excel file, so the two can never
 * disagree.
 */

import type { CrmLead, CrmUser } from "@/lib/types";
import type { XlsxColumn, XlsxSheet, XlsxValue } from "@/lib/xlsx";
import { toLocalDateString } from "@/components/crm/activities/activities-config";
import { temperatureLabel } from "@/lib/person-fields";
import { sourceLabel } from "./board-config";
import type { JourneyContact, JourneyData, JourneyDeal } from "@/app/(app)/crm/leads/report-actions";

export type JourneyStep = "lead" | "contact" | "offer" | "deal" | "done";

export const JOURNEY_STEPS: { key: JourneyStep; label: string; color: string }[] = [
  { key: "lead", label: "Leads", color: "#579bfc" },
  { key: "contact", label: "Moved to contact", color: "#00a0a0" },
  { key: "offer", label: "Got an offer", color: "#fdab3d" },
  { key: "deal", label: "Deal accepted", color: "#a25ddc" },
  { key: "done", label: "Deal done", color: "#00c875" },
];

export interface LeadJourney {
  lead: CrmLead;
  /** YYYY-MM-DD the lead came in */
  enteredOn: string | null;
  contact: JourneyContact | null;
  /** how the contact was found: the stored link, or the same phone number */
  contactMatch: "link" | "phone" | null;
  movedOn: string | null;
  offers: JourneyDeal[];
  firstOfferOn: string | null;
  accepted: JourneyDeal[];
  firstDealOn: string | null;
  acceptedValue: number;
  doneOn: string | null;
  /** the furthest step the lead has reached */
  reached: JourneyStep;
}

/** The day a lead came in — the board's Date column, in the viewer's own zone. */
export function entryDay(lead: CrmLead): string | null {
  return lead.lead_date ?? toLocalDateString(lead.created_at);
}

/** Inclusive window on the entry day; an open end does not limit. */
export function inWindow(day: string | null, from: string | null, to: string | null): boolean {
  if (!from && !to) return true;
  if (!day) return false;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

function earliest(days: (string | null | undefined)[]): string | null {
  const real = days.filter(Boolean).map((d) => toLocalDateString(d as string)).filter(Boolean) as string[];
  return real.length ? real.sort()[0] : null;
}

/** Follow every lead onto its contact and that contact's offers and deals. */
export function buildJourneys(leads: CrmLead[], data: JourneyData): LeadJourney[] {
  const byId = new Map(data.contacts.map((c) => [c.id, c]));
  // the phone fallback: 39 live leads carry the ✓ with no stored link, because
  // the conversion merged them into an existing card. Their phone still names it.
  const byPhone = new Map<string, JourneyContact>();
  for (const c of data.contacts) {
    const key = digits(c.country_code) + digits(c.phone);
    if (digits(c.phone).length >= 6) byPhone.set(key, c);
  }

  return leads.map((lead) => {
    const moved = Boolean((lead.custom as Record<string, unknown> | null)?.moved_to_contacts);
    let contact: JourneyContact | null = null;
    let contactMatch: LeadJourney["contactMatch"] = null;
    if (lead.converted_contact_id && byId.has(lead.converted_contact_id)) {
      contact = byId.get(lead.converted_contact_id) ?? null;
      contactMatch = "link";
    } else if (moved && digits(lead.phone).length >= 6) {
      contact = byPhone.get(digits(lead.country_code) + digits(lead.phone)) ?? null;
      contactMatch = contact ? "phone" : null;
    }

    // offers on that contact: the stored link first, the cached name second —
    // the same rule the Contacts board uses for its deal-done badge
    const offers = contact
      ? data.deals.filter(
          (d) =>
            d.contact_id === contact!.id ||
            (!d.contact_id &&
              !!d.contact_name &&
              d.contact_name.trim().toLowerCase() === contact!.name.trim().toLowerCase())
        )
      : [];
    const accepted = offers.filter((d) => d.accepted_at);
    const done = accepted.filter((d) => d.downpayment_completed_at);

    const movedOn = contact || moved ? toLocalDateString(lead.converted_at) : null;
    const reached: JourneyStep = done.length
      ? "done"
      : accepted.length
        ? "deal"
        : offers.length
          ? "offer"
          : contact || moved || lead.converted_contact_id
            ? "contact"
            : "lead";

    return {
      lead,
      enteredOn: entryDay(lead),
      contact,
      contactMatch,
      movedOn,
      offers,
      firstOfferOn: earliest(offers.map((o) => o.created_at)),
      accepted,
      firstDealOn: earliest(accepted.map((d) => d.accepted_at)),
      acceptedValue: accepted.reduce((s, d) => s + (d.deal_value ?? 0), 0),
      doneOn: earliest(done.map((d) => d.downpayment_completed_at)),
      reached,
    };
  });
}

const RANK: Record<JourneyStep, number> = { lead: 0, contact: 1, offer: 2, deal: 3, done: 4 };

/** How many leads reached AT LEAST each step — a funnel, not a partition. */
export function funnel(journeys: LeadJourney[]): Record<JourneyStep, number> {
  const out: Record<JourneyStep, number> = { lead: 0, contact: 0, offer: 0, deal: 0, done: 0 };
  for (const j of journeys) {
    for (const step of JOURNEY_STEPS) if (RANK[j.reached] >= RANK[step.key]) out[step.key] += 1;
  }
  return out;
}

export interface AgentRow {
  agentId: string | null;
  agent: string;
  counts: Record<JourneyStep, number>;
  acceptedValue: number;
}

/** One line per agent who entered leads in the window, most leads first. */
export function byAgent(journeys: LeadJourney[], users: CrmUser[]): AgentRow[] {
  const groups = new Map<string, LeadJourney[]>();
  for (const j of journeys) {
    const key = j.lead.created_by ?? "—";
    groups.set(key, [...(groups.get(key) ?? []), j]);
  }
  return [...groups.entries()]
    .map(([id, list]) => ({
      agentId: id === "—" ? null : id,
      agent: users.find((u) => u.id === id)?.full_name ?? "Unknown",
      counts: funnel(list),
      acceptedValue: list.reduce((s, j) => s + j.acceptedValue, 0),
    }))
    .sort((a, b) => b.counts.lead - a.counts.lead || a.agent.localeCompare(b.agent));
}

export const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/* ───────────────────────────────── Excel ───────────────────────────────── */

const STEP_LABEL: Record<JourneyStep, string> = {
  lead: "Lead",
  contact: "Contact",
  offer: "Offer",
  deal: "Deal",
  done: "Done",
};

/**
 * The per-agent summary a manager reads first, one row per lead with every
 * step of its journey dated, and a sheet saying what the file covers. The board
 * adds the full lead sheet between the last two (it owns the board's columns).
 */
export function buildLeadReportSheets(opts: {
  journeys: LeadJourney[];
  users: CrmUser[];
  dealStages: { id: string; name: string }[];
  from: string | null;
  to: string | null;
  /** set when the report was narrowed to one agent's leads */
  agent?: string | null;
}): XlsxSheet[] {
  const { journeys, users, dealStages, from, to, agent } = opts;
  const userName = (id: string | null) => users.find((u) => u.id === id)?.full_name ?? null;
  const stageName = (id: string | null) => dealStages.find((s) => s.id === id)?.name ?? null;
  const window = from || to ? `${from ?? "the start"} to ${to ?? "today"}` : "All time";

  const agents = byAgent(journeys, users);
  const total = funnel(journeys);
  const totalValue = journeys.reduce((s, j) => s + j.acceptedValue, 0);

  const summaryColumns: XlsxColumn[] = [
    { header: "Agent (entered the lead)", width: 28 },
    { header: "Leads", width: 9 },
    { header: "Moved to contact", width: 17 },
    { header: "Got an offer", width: 13 },
    { header: "Deal accepted", width: 14 },
    { header: "Deal done", width: 11 },
    { header: "Lead → contact %", width: 16 },
    { header: "Lead → deal %", width: 14 },
    { header: "Accepted deal value", width: 19 },
  ];
  const summaryRow = (label: string, c: Record<JourneyStep, number>, value: number): XlsxValue[] => [
    label,
    c.lead,
    c.contact,
    c.offer,
    c.deal,
    c.done,
    pct(c.contact, c.lead),
    pct(c.deal, c.lead),
    value || null,
  ];
  // the header row carries an auto-filter, so the sheets hold data only; what
  // the file covers and what each step means go on a sheet of their own
  const summary: XlsxSheet = {
    name: "Summary",
    columns: summaryColumns,
    rows: [
      ...agents.map((a) => summaryRow(a.agent, a.counts, a.acceptedValue)),
      summaryRow("All agents", total, totalValue),
    ],
  };
  const about: XlsxSheet = {
    name: "About",
    columns: [
      { header: "Item", width: 22 },
      { header: "Value", width: 90, wrap: true },
    ],
    rows: [
      ["Window", `${window}, by the day each lead came in (the board's Date column)`],
      ["Agent", agent ? `Only the leads entered by ${agent}` : "Every agent"],
      ["Leads", String(total.lead)],
      ["Who counts as the agent", "Whoever entered the lead. The owner is on the Lead journey sheet too."],
      ["Leads (all fields)", "Every column of every lead in this report, custom columns included, as the board's own Export writes them."],
      ["Moved to contact", "The lead was moved to Contacts (the ✓ on the board)."],
      ["Got an offer", "At least one offer exists on that contact."],
      ["Deal accepted", "At least one of those offers was accepted by the client."],
      ["Deal done", "The downpayment on an accepted deal is complete."],
      ["Counting", "Each column counts leads that reached AT LEAST that step, so it reads as a funnel."],
      ["Exported", toLocalDateString(new Date().toISOString())],
    ],
  };

  const journeyColumns: XlsxColumn[] = [
    { header: "Lead", width: 30 },
    { header: "Came in", width: 12 },
    { header: "Lead Source", width: 15 },
    { header: "Entered by", width: 22 },
    { header: "Owner", width: 22 },
    { header: "Lead status", width: 12 },
    { header: "Country code", width: 13 },
    { header: "Telephone", width: 18 },
    { header: "Furthest step", width: 13 },
    { header: "Moved to contact on", width: 19 },
    { header: "Contact", width: 28 },
    { header: "Contact code", width: 13 },
    { header: "Offers", width: 8 },
    { header: "First offer on", width: 14 },
    { header: "Latest offer stage", width: 18 },
    { header: "Deals accepted", width: 14 },
    { header: "First deal on", width: 13 },
    { header: "Accepted value", width: 15 },
    { header: "Deal done on", width: 13 },
    { header: "Lead ID", width: 38 },
  ];
  const journeyRows: XlsxValue[][] = journeys
    .slice()
    .sort((a, b) => (a.enteredOn ?? "").localeCompare(b.enteredOn ?? "") || a.lead.name.localeCompare(b.lead.name))
    .map((j) => {
      const latest = j.offers.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      return [
        j.lead.name,
        { date: j.enteredOn },
        j.lead.source ? sourceLabel(j.lead.source) : null,
        userName(j.lead.created_by),
        userName(j.lead.owner_id),
        j.lead.temperature ? temperatureLabel(j.lead.temperature) : null,
        j.lead.country_code,
        j.lead.phone,
        STEP_LABEL[j.reached],
        { date: j.movedOn },
        j.contact?.name ?? null,
        j.contact?.code ?? null,
        j.offers.length || null,
        { date: j.firstOfferOn },
        latest ? stageName(latest.stage_id) : null,
        j.accepted.length || null,
        { date: j.firstDealOn },
        j.acceptedValue || null,
        { date: j.doneOn },
        j.lead.id,
      ];
    });

  return [summary, { name: "Lead journey", columns: journeyColumns, rows: journeyRows }, about];
}

export function leadReportFileName(from: string | null, to: string | null, agent?: string | null): string {
  const today = toLocalDateString(new Date().toISOString());
  // an agent's name goes in as written, spaces made safe for every OS
  const who = agent ? `-${agent.trim().replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "-")}` : "";
  if (!from && !to) return `lead-report${who}-all-time-${today}.xlsx`;
  return `lead-report${who}-${from ?? "start"}-to-${to ?? today}.xlsx`;
}
