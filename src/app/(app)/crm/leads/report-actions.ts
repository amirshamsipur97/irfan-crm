"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { isFullAccess } from "@/lib/permissions";

/** A contact, as much as the lead report needs to follow a lead onto it. */
export interface JourneyContact {
  id: string;
  code: string | null;
  name: string;
  phone: string | null;
  country_code: string | null;
}

/** An offer, as much as the lead report needs to place it on the journey. */
export interface JourneyDeal {
  id: string;
  name: string;
  contact_id: string | null;
  contact_name: string | null;
  stage_id: string | null;
  created_at: string;
  accepted_at: string | null;
  deal_value: number | null;
  currency: string | null;
  downpayment_completed_at: string | null;
}

export interface JourneyData {
  contacts: JourneyContact[];
  deals: JourneyDeal[];
  dealStages: { id: string; name: string }[];
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
  const [{ data: contacts, error: cErr }, { data: deals, error: dErr }, { data: stages }] = await Promise.all([
    supabase
      .from("crm_contacts")
      .select("id, code, name, phone, country_code")
      .returns<JourneyContact[]>(),
    supabase
      .from("crm_deals")
      .select("id, name, contact_id, contact_name, stage_id, created_at, accepted_at, deal_value, currency, downpayment_completed_at")
      .returns<JourneyDeal[]>(),
    supabase.from("crm_deal_stages").select("id, name").order("position").returns<{ id: string; name: string }[]>(),
  ]);
  if (cErr || dErr) return { error: (cErr ?? dErr)?.message ?? "could not read the journey" };
  return { contacts: contacts ?? [], deals: deals ?? [], dealStages: stages ?? [] };
}
