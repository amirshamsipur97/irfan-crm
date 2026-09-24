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
  email: string | null;
  /** owner, falling back to whoever created the row (the duplicate guard's rule) */
  owner_id: string | null;
  group_name: string | null;
  temperature: string | null;
  source: string | null;
  country: string | null;
  lead_date: string | null;
  created_at: string;
  /** leads only: the contact this lead was moved to */
  converted_contact_id: string | null;
  is_archived: boolean;
};

export type PhoneSearchResult = { ok: true; hits: PhoneHit[]; truncated: boolean } | { ok: false; error: string };

export type PhoneSearchInput = { query: string; agentId?: string | null };

/** Per board. A number search stays short; one agent's whole book is never near this. */
const LIMIT_NUMBER = 50;
const LIMIT_AGENT = 2000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Admin phone lookup across Leads and Contacts (developer + CEO only).
 *
 * Matches on `normalized_phone` (country code + number, punctuation stripped),
 * the same key the duplicate-phone guard uses, so "+968 9123 4567", "9123-4567"
 * and "0096891234567" all find the same row. Partial numbers match anywhere.
 *
 * With an agent picked, every number that agent holds is listed and the digits
 * (if any) only narrow it. Holding = owner, or creator when the row has no owner.
 */
export async function searchPhones(input: PhoneSearchInput): Promise<PhoneSearchResult> {
  const profile = await getProfile();
  if (!isFullAccess(profile.role)) return { ok: false, error: "Only admins can search phone numbers" };

  const agentId = input.agentId || null;
  if (agentId && !UUID.test(agentId)) return { ok: false, error: "Unknown agent" };

  // digits only, so it is safe inside the ilike pattern
  const digits = phoneQueryDigits(input.query);
  const byNumber = digits.length >= MIN_PHONE_DIGITS;
  if (!agentId && !byNumber) return { ok: true, hits: [], truncated: false };
  const limit = agentId ? LIMIT_AGENT : LIMIT_NUMBER;

  const supabase = await createClient();
  let leadsQ = supabase
    .from("crm_leads")
    .select(
      "id, name, country_code, phone, email, owner_id, created_by, temperature, source, country, lead_date, created_at, converted_contact_id, is_archived, crm_lead_groups(name)"
    )
    .not("normalized_phone", "is", null);
  let contactsQ = supabase
    .from("crm_contacts")
    .select(
      "id, name, country_code, phone, email, owner_id, created_by, temperature, lead_source, country, lead_date, created_at, crm_contact_groups(name)"
    )
    .not("normalized_phone", "is", null);

  if (byNumber) {
    leadsQ = leadsQ.ilike("normalized_phone", `%${digits}%`);
    contactsQ = contactsQ.ilike("normalized_phone", `%${digits}%`);
  }
  if (agentId) {
    const holds = `owner_id.eq.${agentId},and(owner_id.is.null,created_by.eq.${agentId})`;
    leadsQ = leadsQ.or(holds);
    contactsQ = contactsQ.or(holds);
  }

  const [leads, contacts] = await Promise.all([
    leadsQ.order("created_at", { ascending: false }).limit(limit + 1),
    contactsQ.order("created_at", { ascending: false }).limit(limit + 1),
  ]);
  if (leads.error || contacts.error) {
    return { ok: false, error: (leads.error ?? contacts.error)!.message };
  }

  type Row = Record<string, unknown>;
  const str = (v: unknown) => (v == null || v === "" ? null : String(v));
  const groupName = (g: unknown) => {
    const one = Array.isArray(g) ? g[0] : g;
    return str((one as { name?: string } | null)?.name);
  };
  const toHit = (table: PhoneHit["table"], r: Row, group: unknown, source: unknown): PhoneHit => ({
    table,
    id: r.id as string,
    name: str(r.name),
    country_code: str(r.country_code),
    phone: str(r.phone),
    email: str(r.email),
    owner_id: str(r.owner_id ?? r.created_by),
    group_name: groupName(group),
    temperature: str(r.temperature),
    source: str(source),
    country: str(r.country),
    lead_date: str(r.lead_date),
    created_at: r.created_at as string,
    converted_contact_id: str(r.converted_contact_id),
    is_archived: Boolean(r.is_archived),
  });

  const leadRows = (leads.data ?? []) as Row[];
  const contactRows = (contacts.data ?? []) as Row[];
  const hits = [
    ...contactRows.slice(0, limit).map((r) => toHit("crm_contacts", r, r.crm_contact_groups, r.lead_source)),
    ...leadRows.slice(0, limit).map((r) => toHit("crm_leads", r, r.crm_lead_groups, r.source)),
  ];
  return { ok: true, hits, truncated: leadRows.length > limit || contactRows.length > limit };
}
