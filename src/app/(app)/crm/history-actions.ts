"use server";

import { PERMISSION_ERROR } from "@/lib/mutate";
import { createClient } from "@/lib/supabase/server";
import type {
  MilestoneContact,
  MilestoneDeal,
  MilestoneLead,
} from "@/components/crm/follow-ups/history-timeline";
import type { CrmLeadHistory, OfferTrackingType } from "@/lib/types";

const ENTRY_TYPES: OfferTrackingType[] = ["note", "call", "meeting", "email", "viewing", "document"];
const BUCKET = "crm-documents";
const LEAD_COLS =
  "id, name, created_at, created_by, owner_id, assigned_at, first_response_at, converted_at, converted_contact_id, source";
const CONTACT_COLS = "id, code, name, created_at, created_by";
const DEAL_COLS =
  "id, created_at, accepted_at, downpayment_completed_at, invoice_sent_at, deal_value, currency, project_name, account_name";

export interface LeadHistoryData {
  entries: CrmLeadHistory[];
  leads: MilestoneLead[];
  contact: MilestoneContact | null;
  deals: MilestoneDeal[];
  users: { id: string; full_name: string | null }[];
}

const EMPTY: LeadHistoryData = { entries: [], leads: [], contact: null, deals: [], users: [] };

/**
 * Everything a client's Lead history is drawn from, for either side of the
 * move: from a lead (plus the contact it became) or from a contact (plus the
 * lead(s) it came from). Raw rows only; the drawer turns them into milestones
 * in the browser, where local dates and labels live. Read through the
 * caller's own session, so per-agent visibility decides what comes back.
 */
export async function listLeadHistory(scope: { leadId?: string; contactId?: string }): Promise<LeadHistoryData> {
  const supabase = await createClient();
  let leads: (MilestoneLead & { converted_contact_id: string | null })[] = [];
  let contact: MilestoneContact | null = null;

  if (scope.leadId) {
    const { data: lead } = await supabase
      .from("crm_leads")
      .select(LEAD_COLS)
      .eq("id", scope.leadId)
      .maybeSingle<MilestoneLead & { converted_contact_id: string | null }>();
    if (!lead) return EMPTY;
    leads = [lead];
    if (lead.converted_contact_id) {
      const { data } = await supabase
        .from("crm_contacts")
        .select(CONTACT_COLS)
        .eq("id", lead.converted_contact_id)
        .maybeSingle<MilestoneContact>();
      contact = data ?? null;
    }
  } else if (scope.contactId) {
    const { data } = await supabase
      .from("crm_contacts")
      .select(CONTACT_COLS)
      .eq("id", scope.contactId)
      .maybeSingle<MilestoneContact>();
    if (!data) return EMPTY;
    contact = data;
    const { data: sourceLeads } = await supabase
      .from("crm_leads")
      .select(LEAD_COLS)
      .eq("converted_contact_id", scope.contactId)
      .order("created_at")
      .returns<(MilestoneLead & { converted_contact_id: string | null })[]>();
    leads = sourceLeads ?? [];
  } else {
    return EMPTY;
  }

  const filters = [
    ...(leads.length ? [`lead_id.in.(${leads.map((l) => l.id).join(",")})`] : []),
    ...(contact ? [`contact_id.eq.${contact.id}`] : []),
  ];

  const [{ data: entries }, { data: deals }, { data: users }] = await Promise.all([
    supabase
      .from("crm_lead_history")
      .select("*, author:created_by(full_name, avatar_url)")
      .or(filters.join(","))
      .order("entry_date", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<CrmLeadHistory[]>(),
    contact
      ? supabase.from("crm_deals").select(DEAL_COLS).eq("contact_id", contact.id).returns<MilestoneDeal[]>()
      : Promise.resolve({ data: [] as MilestoneDeal[] }),
    supabase.from("crm_users").select("id, full_name").returns<{ id: string; full_name: string | null }[]>(),
  ]);

  return {
    entries: entries ?? [],
    leads,
    contact,
    deals: deals ?? [],
    users: users ?? [],
  };
}

/**
 * Add an entry to a client's history. Exactly one of leadId / contactId. The
 * file (if any) is already in the private bucket: the browser uploads it
 * directly, the same way offer-trail attachments go.
 */
export async function addLeadHistoryEntry(input: {
  leadId: string | null;
  contactId: string | null;
  entryType: OfferTrackingType;
  durationMin: number | null;
  entryDate: string;
  note: string;
  remindAt: string | null;
  file: { name: string; storagePath: string; mimeType: string | null; sizeBytes: number | null } | null;
}): Promise<{ entry?: CrmLeadHistory; error?: string }> {
  const note = input.note.trim();
  if (Boolean(input.leadId) === Boolean(input.contactId)) return { error: "An entry belongs to one lead or one contact." };
  if (!note) return { error: "Write something for this follow-up." };
  if (note.length > 4000) return { error: "Keep the note under 4,000 characters." };
  if (!ENTRY_TYPES.includes(input.entryType)) return { error: "unknown entry type" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.entryDate)) return { error: "Pick a date for this entry." };
  if (input.durationMin != null && !(input.durationMin > 0 && input.durationMin <= 24 * 60)) {
    return { error: "Duration must be between 1 and 1440 minutes." };
  }
  if (input.remindAt != null && Number.isNaN(new Date(input.remindAt).getTime())) {
    return { error: "That reminder time is not a valid date." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { data, error } = await supabase
    .from("crm_lead_history")
    .insert({
      lead_id: input.leadId,
      contact_id: input.contactId,
      entry_type: input.entryType,
      duration_min: input.durationMin,
      entry_date: input.entryDate,
      note,
      remind_at: input.remindAt,
      file_name: input.file?.name ?? null,
      storage_path: input.file?.storagePath ?? null,
      mime_type: input.file?.mimeType ?? null,
      size_bytes: input.file?.sizeBytes ?? null,
      created_by: user.id,
    })
    .select("*, author:created_by(full_name, avatar_url)")
    .single<CrmLeadHistory>();
  // RLS refusing an insert reports 42501 — say it in the team's words
  if (error) return { error: error.code === "42501" ? PERMISSION_ERROR : error.message };
  return { entry: data };
}

/** Tick a reminder off (or back on). */
export async function setLeadHistoryReminderDone(entryId: string, done: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_lead_history")
    .update({ reminder_done: done }, { count: "exact" })
    .eq("id", entryId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  return {};
}

export async function deleteLeadHistoryEntry(entryId: string, storagePath: string | null): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_lead_history")
    .delete({ count: "exact" })
    .eq("id", entryId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  // the row is the source of truth; a leftover object would only be orphaned
  if (storagePath) await supabase.storage.from(BUCKET).remove([storagePath]);
  return {};
}

/**
 * The lead's custom fields as the database has them now — a Lead history
 * reminder rewrites the "next follow up" column through a trigger, and the
 * board must pick that up before its next cell edit writes custom back.
 */
export async function getLeadCustom(leadId: string): Promise<Record<string, unknown> | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("crm_leads")
    .select("custom")
    .eq("id", leadId)
    .maybeSingle<{ custom: Record<string, unknown> | null }>();
  return data ? data.custom ?? {} : null;
}
