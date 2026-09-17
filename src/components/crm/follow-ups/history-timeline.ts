/**
 * Lead history, as pure data: which milestones a client has passed, and how
 * they interleave with the entries people typed. Kept free of React and of
 * any runtime import so the ordering rules can be checked on their own.
 */

import type { CrmLeadHistory, HistoryMilestone } from "@/lib/types";

export interface MilestoneLead {
  id: string;
  name: string;
  created_at: string;
  created_by: string | null;
  owner_id: string | null;
  assigned_at: string | null;
  first_response_at: string | null;
  converted_at: string | null;
  source: string | null;
}

export interface MilestoneContact {
  id: string;
  code: string | null;
  name: string;
  created_at: string;
  created_by: string | null;
}

export interface MilestoneDeal {
  id: string;
  created_at: string;
  accepted_at: string | null;
  downpayment_completed_at: string | null;
  invoice_sent_at: string | null;
  deal_value: number | null;
  currency: string;
  project_name: string | null;
  account_name: string | null;
}

/** "Offer 1", "Offer 2"… by when each was made, the same rule the drawer uses. */
function numberOffers(deals: MilestoneDeal[]): Map<string, number> {
  return new Map(
    [...deals]
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
      .map((d, i) => [d.id, i + 1] as const)
  );
}

// an owner set within a minute of creation is the creator picking themselves,
// not a hand-over worth its own line
const SAME_MOMENT_MS = 60_000;

export function buildMilestones(input: {
  leads: MilestoneLead[];
  contact: MilestoneContact | null;
  deals: MilestoneDeal[];
  userName: (id: string | null) => string | null;
  sourceText: (source: string) => string;
  moneyText: (value: number | null, currency: string) => string;
}): HistoryMilestone[] {
  const { leads, contact, deals, userName, sourceText, moneyText } = input;
  const out: HistoryMilestone[] = [];
  const several = leads.length > 1;
  const join = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(" · ") || null;

  for (const lead of leads) {
    const creator = userName(lead.created_by);
    out.push({
      id: `lead-created-${lead.id}`,
      kind: "lead_created",
      at: lead.created_at,
      title: "Lead created",
      detail: join(creator ? `by ${creator}` : null, lead.source ? sourceText(lead.source) : null, several ? lead.name : null),
    });

    if (
      lead.assigned_at &&
      lead.owner_id &&
      Math.abs(new Date(lead.assigned_at).getTime() - new Date(lead.created_at).getTime()) > SAME_MOMENT_MS
    ) {
      out.push({
        id: `lead-assigned-${lead.id}`,
        kind: "assigned",
        at: lead.assigned_at,
        title: `Assigned to ${userName(lead.owner_id) ?? "an agent"}`,
        detail: several ? lead.name : null,
      });
    }

    if (lead.first_response_at) {
      out.push({
        id: `lead-response-${lead.id}`,
        kind: "first_response",
        at: lead.first_response_at,
        title: "First response",
        detail: several ? lead.name : null,
      });
    }

    if (lead.converted_at) {
      out.push({
        id: `lead-moved-${lead.id}`,
        kind: "moved",
        at: lead.converted_at,
        title: "Moved to contacts",
        detail: join(contact?.code ?? null, several ? lead.name : null),
      });
    }
  }

  if (leads.length === 0 && contact) {
    const creator = userName(contact.created_by);
    out.push({
      id: `contact-created-${contact.id}`,
      kind: "contact_created",
      at: contact.created_at,
      title: "Added to contacts",
      detail: join(creator ? `by ${creator}` : null, contact.code),
    });
  }

  const offerNo = numberOffers(deals);
  for (const deal of deals) {
    const label = `Offer ${offerNo.get(deal.id) ?? "?"}`;
    out.push({
      id: `offer-created-${deal.id}`,
      kind: "offer_created",
      at: deal.created_at,
      title: `${label} created`,
      detail: join(moneyText(deal.deal_value, deal.currency), deal.project_name, deal.account_name),
    });
    if (deal.accepted_at) {
      out.push({ id: `offer-accepted-${deal.id}`, kind: "offer_accepted", at: deal.accepted_at, title: `${label} accepted`, detail: null });
    }
    if (deal.downpayment_completed_at) {
      out.push({
        id: `offer-paid-${deal.id}`,
        kind: "downpayment_done",
        at: deal.downpayment_completed_at,
        title: `${label} downpayment completed`,
        detail: null,
      });
    }
    if (deal.invoice_sent_at) {
      out.push({
        id: `offer-invoice-${deal.id}`,
        kind: "invoice_sent",
        at: deal.invoice_sent_at,
        title: `${label} invoice sent to the developer`,
        detail: null,
      });
    }
  }

  return out;
}

export type TimelineItem =
  | { key: string; at: number; milestone: HistoryMilestone; entry?: undefined }
  | { key: string; at: number; entry: CrmLeadHistory; milestone?: undefined };

/**
 * When an entry happened, for ordering: the date the person picked (a call
 * logged a day late belongs on the day of the call) at the time of day it was
 * saved. Built in LOCAL time from the date parts — new Date("YYYY-MM-DD") is
 * UTC midnight and would move the entry a day west of Greenwich.
 */
export function entryMoment(entry: Pick<CrmLeadHistory, "entry_date" | "created_at">): number {
  const [y, m, d] = entry.entry_date.slice(0, 10).split("-").map(Number);
  const saved = new Date(entry.created_at);
  if (!y || !m || !d) return saved.getTime();
  return new Date(y, m - 1, d, saved.getHours(), saved.getMinutes(), saved.getSeconds()).getTime();
}

/** Oldest first, like reading a story; at the same instant the milestone leads. */
export function mergeTimeline(entries: CrmLeadHistory[], milestones: HistoryMilestone[]): TimelineItem[] {
  const items: TimelineItem[] = [
    ...milestones.map((m) => ({ key: `m-${m.id}`, at: new Date(m.at).getTime(), milestone: m })),
    ...entries.map((e) => ({ key: `e-${e.id}`, at: entryMoment(e), entry: e })),
  ];
  return items.sort((a, b) => {
    if (a.at !== b.at) return a.at - b.at;
    if (Boolean(a.milestone) !== Boolean(b.milestone)) return a.milestone ? -1 : 1;
    return a.key.localeCompare(b.key);
  });
}
