"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { isFullAccess } from "@/lib/permissions";
import { MIN_PHONE_DIGITS, phoneQueryDigits } from "@/lib/phone-search";

/** One lead or contact whose number matched the search. */
export type PhoneHit = {
  table: "crm_leads" | "crm_contacts";
  id: string;
  name: string | null;
  country_code: string | null;
  phone: string | null;
  owner_id: string | null;
  group_name: string | null;
  temperature: string | null;
  created_at: string;
  /** leads only: the contact this lead was moved to */
  converted_contact_id: string | null;
  is_archived: boolean;
};

export type PhoneSearchResult = { ok: true; hits: PhoneHit[]; truncated: boolean } | { ok: false; error: string };

const LIMIT = 50;

/**
 * Admin phone lookup across Leads and Contacts (developer + CEO only).
 *
 * Matches on `normalized_phone` (country code + number, punctuation stripped),
 * the same key the duplicate-phone guard uses, so "+968 9123 4567", "9123-4567"
 * and "0096891234567" all find the same row. Partial numbers match anywhere.
 */
export async function searchPhones(query: string): Promise<PhoneSearchResult> {
  const profile = await getProfile();
  if (!isFullAccess(profile.role)) return { ok: false, error: "Only admins can search phone numbers" };

  // digits only, so it is safe inside the ilike pattern
  const digits = phoneQueryDigits(query);
  if (digits.length < MIN_PHONE_DIGITS) return { ok: true, hits: [], truncated: false };
  const pattern = `%${digits}%`;

  const supabase = await createClient();
  const [leads, contacts] = await Promise.all([
    supabase
      .from("crm_leads")
      .select("id, name, country_code, phone, owner_id, created_by, temperature, created_at, converted_contact_id, is_archived, crm_lead_groups(name)")
      .ilike("normalized_phone", pattern)
      .order("created_at", { ascending: false })
      .limit(LIMIT + 1),
    supabase
      .from("crm_contacts")
      .select("id, name, country_code, phone, owner_id, created_by, temperature, created_at, crm_contact_groups(name)")
      .ilike("normalized_phone", pattern)
      .order("created_at", { ascending: false })
      .limit(LIMIT + 1),
  ]);
  if (leads.error || contacts.error) {
    return { ok: false, error: (leads.error ?? contacts.error)!.message };
  }

  type Row = Record<string, unknown>;
  const groupName = (g: unknown) => {
    const one = Array.isArray(g) ? g[0] : g;
    return ((one as { name?: string } | null)?.name ?? null) as string | null;
  };
  const toHit = (table: PhoneHit["table"], r: Row, group: unknown): PhoneHit => ({
    table,
    id: r.id as string,
    name: (r.name as string | null) ?? null,
    country_code: (r.country_code as string | null) ?? null,
    phone: (r.phone as string | null) ?? null,
    owner_id: ((r.owner_id ?? r.created_by) as string | null) ?? null,
    group_name: groupName(group),
    temperature: (r.temperature as string | null) ?? null,
    created_at: r.created_at as string,
    converted_contact_id: (r.converted_contact_id as string | null) ?? null,
    is_archived: Boolean(r.is_archived),
  });

  const leadRows = (leads.data ?? []) as Row[];
  const contactRows = (contacts.data ?? []) as Row[];
  const hits = [
    ...contactRows.slice(0, LIMIT).map((r) => toHit("crm_contacts", r, r.crm_contact_groups)),
    ...leadRows.slice(0, LIMIT).map((r) => toHit("crm_leads", r, r.crm_lead_groups)),
  ];
  return { ok: true, hits, truncated: leadRows.length > LIMIT || contactRows.length > LIMIT };
}
