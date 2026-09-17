"use server";

import { PERMISSION_ERROR } from "@/lib/mutate";
import { createClient } from "@/lib/supabase/server";
import type { CrmLeadHistory, CrmOfferTracking } from "@/lib/types";

/**
 * One reminder, from either trail: a Lead history entry (lead or contact) or
 * an offer's Lead tracking entry. `source` says which table to write back to.
 */
export type ReminderRow = CrmLeadHistory & {
  source: "history" | "offer";
  lead: { id: string; name: string; owner_id: string | null } | null;
  contact: { id: string; name: string; code: string | null; owner_id: string | null } | null;
  /** set on offer-trail reminders: which offer it was logged on */
  offer: { id: string; label: string } | null;
};

type OfferTrackingRow = CrmOfferTracking & {
  deal: {
    id: string;
    contact_id: string | null;
    contact_name: string | null;
    owner_id: string | null;
    account_name: string | null;
    project_name: string | null;
    contact: { id: string; name: string; code: string | null; owner_id: string | null } | null;
  } | null;
};

export type ClientOption = { kind: "lead" | "contact"; id: string; name: string; code: string | null };

const DONE_WINDOW_DAYS = 30;

/**
 * Every reminder the caller can see: all open ones, plus the ones ticked off
 * in the last 30 days. Read through the caller's own session, so the same
 * per-agent visibility as the boards decides what comes back.
 */
export async function listReminders(): Promise<ReminderRow[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - DONE_WINDOW_DAYS * 86_400_000).toISOString();
  const [{ data: history }, { data: offers }] = await Promise.all([
    supabase
      .from("crm_lead_history")
      .select(
        "*, author:created_by(full_name, avatar_url), lead:lead_id(id, name, owner_id), contact:contact_id(id, name, code, owner_id)"
      )
      .not("remind_at", "is", null)
      .or(`reminder_done.eq.false,remind_at.gte.${since}`)
      .returns<Omit<ReminderRow, "source" | "offer">[]>(),
    supabase
      .from("crm_offer_tracking")
      .select(
        "*, author:created_by(full_name, avatar_url), deal:deal_id(id, contact_id, contact_name, owner_id, account_name, project_name, contact:contact_id(id, name, code, owner_id))"
      )
      .not("remind_at", "is", null)
      .or(`reminder_done.eq.false,remind_at.gte.${since}`)
      .returns<OfferTrackingRow[]>(),
  ]);

  const rows: ReminderRow[] = [
    ...(history ?? []).map((h) => ({ ...h, source: "history" as const, offer: null })),
    ...(offers ?? []).map((t) => {
      const { deal, ...entry } = t;
      const label = [deal?.project_name, deal?.account_name].filter(Boolean).join(" · ");
      return {
        ...entry,
        lead_id: null,
        contact_id: deal?.contact_id ?? null,
        source: "offer" as const,
        lead: null,
        contact:
          deal?.contact ??
          (deal?.contact_id
            ? { id: deal.contact_id, name: deal.contact_name ?? "Contact", code: null, owner_id: deal.owner_id }
            : null),
        offer: deal ? { id: deal.id, label: label ? `Offer · ${label}` : "Offer" } : null,
      } as unknown as ReminderRow;
    }),
  ];
  return rows.sort((a, b) => (a.remind_at ?? "").localeCompare(b.remind_at ?? ""));
}

/** Leads and contacts whose name (or contact code) matches, for the New reminder picker. */
export async function searchReminderClients(query: string): Promise<ClientOption[]> {
  const q = query.trim().replace(/[%,()]/g, " ");
  if (q.length < 2) return [];
  const supabase = await createClient();
  const [{ data: leads }, { data: contacts }] = await Promise.all([
    supabase
      .from("crm_leads")
      .select("id, name")
      .eq("is_archived", false)
      .ilike("name", `%${q}%`)
      .order("name")
      .limit(8)
      .returns<{ id: string; name: string }[]>(),
    supabase
      .from("crm_contacts")
      .select("id, name, code")
      .or(`name.ilike.%${q}%,code.ilike.%${q}%`)
      .order("name")
      .limit(8)
      .returns<{ id: string; name: string; code: string | null }[]>(),
  ]);
  return [
    ...(leads ?? []).map((l) => ({ kind: "lead" as const, id: l.id, name: l.name, code: null })),
    ...(contacts ?? []).map((c) => ({ kind: "contact" as const, id: c.id, name: c.name, code: c.code })),
  ];
}

/** Move a reminder to a new time. A new time re-arms it (not done, not sent). */
export async function setReminderTime(entryId: string, remindAt: string): Promise<{ error?: string }> {
  if (Number.isNaN(new Date(remindAt).getTime())) return { error: "That reminder time is not a valid date." };
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_lead_history")
    .update({ remind_at: remindAt, reminder_done: false }, { count: "exact" })
    .eq("id", entryId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  return {};
}
