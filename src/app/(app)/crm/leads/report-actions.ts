"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { isFullAccess } from "@/lib/permissions";
import type { CrmContact, CrmDeal } from "@/lib/types";
import type { CrmCustomColumn } from "@/lib/custom-columns";

/**
 * The contact a lead became — the whole row, so the report can hand over every
 * field the Contacts table holds, not just enough to find it.
 */
export type JourneyContact = CrmContact;

/** An offer on that contact — the whole Offers-table row, for the same reason. */
export type JourneyDeal = CrmDeal;

export interface JourneyData {
  contacts: JourneyContact[];
  deals: JourneyDeal[];
  dealStages: { id: string; name: string }[];
  /** the Contacts table's own added columns, so the report carries them too */
  contactColumns: CrmCustomColumn[];
}

/**
 * The second half of every lead's journey — the contact it became and the
 * offers and deals made on that contact — for the admin report on the Leads
 * board.
 *
 * Full-access roles only (developer, CEO), checked here as well as in the UI:
 * the report exists to compare agents, and an agent reading everyone's
 * conversion is exactly what the tier exists to prevent. Read through the
 * caller's own session, so the database decides visibility as it does
 * everywhere else.
 */
export async function getLeadJourneyData(): Promise<JourneyData | { error: string }> {
  const profile = await getProfile();
  if (!isFullAccess(profile.role)) return { error: "The lead report is for admins only." };

  const supabase = await createClient();
  const [{ data: contacts, error: cErr }, { data: deals, error: dErr }, { data: stages }, { data: columns }] =
    await Promise.all([
      supabase.from("crm_contacts").select("*").returns<CrmContact[]>(),
      supabase.from("crm_deals").select("*").returns<CrmDeal[]>(),
      supabase.from("crm_deal_stages").select("id, name").order("position").returns<{ id: string; name: string }[]>(),
      supabase
        .from("crm_custom_columns")
        .select("*")
        .eq("board_key", "contacts")
        .order("position")
        .returns<CrmCustomColumn[]>(),
    ]);
  if (cErr || dErr) return { error: (cErr ?? dErr)?.message ?? "could not read the journey" };
  return { contacts: contacts ?? [], deals: deals ?? [], dealStages: stages ?? [], contactColumns: columns ?? [] };
}
