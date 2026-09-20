"use server";

import { revalidatePath } from "next/cache";
import { PERMISSION_ERROR } from "@/lib/mutate";
import { createClient } from "@/lib/supabase/server";
import type { CrmContactNegotiation } from "@/lib/types";

const BOARD_PATH = "/crm/contacts";

/** whitelist of directly patchable crm_contact_negotiations columns */
const PATCHABLE = new Set([
  "negotiated_at",
  "channel",
  "resident",
  "purpose",
  "purpose_other",
  "has_offer",
  "alt_project",
  "alt_project_id",
  "readiness",
  "note",
  "next_at",
]);

/** Every round this client has been negotiated, oldest first. */
export async function listNegotiations(contactId: string): Promise<CrmContactNegotiation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("crm_contact_negotiations")
    .select("*")
    .eq("contact_id", contactId)
    .order("round")
    .returns<CrmContactNegotiation[]>();
  return data ?? [];
}

/**
 * The client row carries the board's copy of the log: the FIRST round's date
 * (the "First negotiation" column), the LATEST round's answers and note (the
 * summary cell and the drawer chips) and the latest planned next date. Mirror,
 * never a second truth — recomputed from the rounds after every write.
 */
async function mirrorToContact(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contactId: string
): Promise<Record<string, unknown>> {
  const { data: rounds } = await supabase
    .from("crm_contact_negotiations")
    .select("*")
    .eq("contact_id", contactId)
    .order("round")
    .returns<CrmContactNegotiation[]>();

  const first = rounds?.[0] ?? null;
  const latest = rounds?.length ? rounds[rounds.length - 1] : null;

  const mirror = {
    first_negotiation_at: first?.negotiated_at ?? null,
    first_negotiation_note: latest?.note ?? null,
    negotiation_channel: latest?.channel ?? null,
    negotiation_resident: latest?.resident ?? null,
    negotiation_purpose: latest?.purpose ?? null,
    negotiation_purpose_other: latest?.purpose_other ?? null,
    negotiation_has_offer: latest?.has_offer ?? null,
    negotiation_alt_project: latest?.alt_project ?? null,
    negotiation_alt_project_id: latest?.alt_project_id ?? null,
    negotiation_readiness: latest?.readiness ?? null,
    next_negotiation_at: latest?.next_at ?? null,
  };

  await supabase.from("crm_contacts").update(mirror).eq("id", contactId);
  // handed back so the open board can patch its row without a reload
  return mirror;
}

/**
 * Add a round. The number is taken from the rounds that exist, so two agents
 * adding at once cannot both become "round 3" (the unique constraint refuses
 * the second, and the caller retries by reloading).
 */
export async function createNegotiation(contactId: string, values: Record<string, unknown>) {
  const entries = Object.entries(values).filter(([k]) => PATCHABLE.has(k));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { data: last } = await supabase
    .from("crm_contact_negotiations")
    .select("round")
    .eq("contact_id", contactId)
    .order("round", { ascending: false })
    .limit(1)
    .maybeSingle<{ round: number }>();

  const { data, error } = await supabase
    .from("crm_contact_negotiations")
    .insert({
      contact_id: contactId,
      round: (last?.round ?? 0) + 1,
      created_by: user.id,
      ...Object.fromEntries(entries),
    })
    .select("*")
    .single<CrmContactNegotiation>();

  if (error) return { error: error.message };
  const mirror = await mirrorToContact(supabase, contactId);
  revalidatePath(BOARD_PATH);
  return { row: data, mirror };
}

export async function updateNegotiation(id: string, patch: Record<string, unknown>) {
  const entries = Object.entries(patch).filter(([k]) => PATCHABLE.has(k));
  if (entries.length === 0) return { error: "nothing to update" };

  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("crm_contact_negotiations")
    .update(Object.fromEntries(entries), { count: "exact" })
    .eq("id", id)
    .select("contact_id")
    .maybeSingle<{ contact_id: string }>();
  if (error) return { error: error.message };
  // RLS refuses by matching no rows, not by erroring
  if (!count || !data) return { error: PERMISSION_ERROR };

  const mirror = await mirrorToContact(supabase, data.contact_id);
  revalidatePath(BOARD_PATH);
  return { mirror };
}

export async function deleteNegotiation(id: string) {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("crm_contact_negotiations")
    .select("contact_id")
    .eq("id", id)
    .maybeSingle<{ contact_id: string }>();
  if (!row) return { error: "that negotiation is already gone" };

  const { error, count } = await supabase
    .from("crm_contact_negotiations")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };

  const mirror = await mirrorToContact(supabase, row.contact_id);
  revalidatePath(BOARD_PATH);
  return { mirror };
}

/**
 * The board's "First negotiation" date column writes through to round 1, so
 * the column and the log can never disagree. With no rounds yet, the edit
 * creates round 1.
 */
export async function setFirstNegotiationDate(contactId: string, date: string | null) {
  const supabase = await createClient();
  const { data: first } = await supabase
    .from("crm_contact_negotiations")
    .select("id")
    .eq("contact_id", contactId)
    .order("round")
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (!first) return createNegotiation(contactId, { negotiated_at: date });
  return updateNegotiation(first.id, { negotiated_at: date });
}
