"use server";

import { revalidatePath } from "next/cache";
import { PERMISSION_ERROR } from "@/lib/mutate";
import { createClient } from "@/lib/supabase/server";

const BOARD_PATH = "/crm/offers";

/** whitelist of directly patchable crm_deals columns */
const PATCHABLE = new Set([
  "name",
  "stage_id",
  "owner_id",
  "deal_value",
  "close_probability",
  "expected_close_date",
  "is_done",
  "contact_name",
  "account_name",
  // set by the picker when an option is chosen — pins same-named people/companies
  "contact_id",
  "account_id",
  "forecast_category",
  "last_interaction_at",
  "currency",
  "lost_reason",
  "next_step",
  "offer_property_type",
  "offer_bedrooms",
  "offer_details",
  "accepted_at",
  "downpayment_percent",
  "invoice_sent_at",
  "custom",
]);

/** Log a meeting / call / note / email from a deal's Activities timeline. */
export async function logDealActivity(
  dealId: string,
  input: {
    activityType: string;
    title: string;
    summary: string;
    startAt: string | null;
    endAt: string | null;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const [{ data: deal }, { data: group }] = await Promise.all([
    supabase.from("crm_deals").select("name").eq("id", dealId).maybeSingle<{ name: string }>(),
    supabase
      .from("crm_activity_groups")
      .select("id")
      .order("position")
      .limit(1)
      .maybeSingle<{ id: string }>(),
  ]);

  const firstLine = input.summary.split("\n")[0].trim().slice(0, 80);
  const { error } = await supabase.from("crm_activity_items").insert({
    name: firstLine || input.title,
    group_id: group?.id ?? null,
    owner_id: user.id,
    activity_type: input.activityType,
    status: "done",
    start_at: input.startAt,
    end_at: input.endAt,
    related_item: deal?.name ?? null,
    created_by: user.id,
  });
  if (error) return { error: error.message };

  const { error: dealError } = await supabase
    .from("crm_deals")
    .update({ last_interaction_at: input.startAt ?? new Date().toISOString() })
    .eq("id", dealId);
  if (dealError) return { error: dealError.message };

  revalidatePath(BOARD_PATH);
  revalidatePath("/crm/activities");
  return {};
}

export async function addDeal(groupId: string, name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { data: stage } = await supabase
    .from("crm_deal_stages")
    .select("id")
    .order("position")
    .limit(1)
    .single<{ id: string }>();
  if (!stage) return { error: "no deal stages configured" };

  const { data, error } = await supabase
    .from("crm_deals")
    .insert({
      name: name.trim() || "New Offer",
      group_id: groupId,
      stage_id: stage.id,
      created_by: user.id,
    })
    .select("*")
    .single<Record<string, unknown>>();

  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return { id: data.id as string, row: data };
}

export async function updateDeal(dealId: string, patch: Record<string, unknown>) {
  const entries = Object.entries(patch).filter(([k]) => PATCHABLE.has(k));
  if (entries.length === 0) return { error: "nothing to update" };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_deals")
    .update(Object.fromEntries(entries), { count: "exact" })
    .eq("id", dealId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  revalidatePath(BOARD_PATH);
  // both boards read crm_deals — an accepted offer shows up on Deals too
  revalidatePath("/crm/deals");
  return {};
}

export async function addDealGroup(name: string, color: string) {
  const supabase = await createClient();

  const { data: last } = await supabase
    .from("crm_deal_groups")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();

  const { data, error } = await supabase
    .from("crm_deal_groups")
    .insert({ name, color, position: (last?.position ?? -1) + 1 })
    .select("id")
    .single<{ id: string }>();

  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return { id: data.id };
}

export async function renameDealGroup(groupId: string, name: string) {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_deal_groups")
    .update({ name: name.trim() || "New Group" }, { count: "exact" })
    .eq("id", groupId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  revalidatePath(BOARD_PATH);
  return {};
}

/** Quick-create an account from the deal board's connect picker. */
export async function quickCreateAccount(name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { data: group } = await supabase
    .from("crm_account_groups")
    .select("id")
    .order("position")
    .limit(1)
    .maybeSingle<{ id: string }>();

  const { error } = await supabase.from("crm_accounts").insert({
    name: name.trim(),
    group_id: group?.id ?? null,
    owner_id: user.id,
    created_by: user.id,
  });
  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  revalidatePath("/crm/accounts");
  return {};
}

/** Quick-create a contact from the deal board's connect picker. */
export async function quickCreateContact(name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { data: group } = await supabase
    .from("crm_contact_groups")
    .select("id")
    .order("position")
    .limit(1)
    .maybeSingle<{ id: string }>();

  const { error } = await supabase.from("crm_contacts").insert({
    name: name.trim(),
    group_id: group?.id ?? null,
    owner_id: user.id,
    created_by: user.id,
  });
  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  revalidatePath("/crm/contacts");
  return {};
}

/**
 * Start a sales offer for a contact. A client can have several offers, so this
 * always creates a new row rather than reusing one, and seeds it with the
 * client's own demand as the starting point for the offer.
 */
export async function createOfferForContact(contactName: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const [{ data: stage }, { data: group }, { data: contact }] = await Promise.all([
    supabase.from("crm_deal_stages").select("id").order("position").limit(1).maybeSingle<{ id: string }>(),
    supabase.from("crm_deal_groups").select("id").order("position").limit(1).maybeSingle<{ id: string }>(),
    supabase
      .from("crm_contacts")
      .select("id, name, property_type, bedrooms, account_name")
      .ilike("name", contactName)
      .maybeSingle<{
        id: string;
        name: string;
        property_type: string | null;
        bedrooms: string | null;
        account_name: string | null;
      }>(),
  ]);
  if (!stage) return { error: "no deal stages configured" };

  const { data, error } = await supabase
    .from("crm_deals")
    .insert({
      name: `Offer — ${contact?.name ?? contactName}`,
      group_id: group?.id ?? null,
      stage_id: stage.id,
      contact_name: contact?.name ?? contactName,
      // start from what the client asked for; the agent adjusts from here
      offer_property_type: contact?.property_type ?? null,
      offer_bedrooms: contact?.bedrooms ?? null,
      owner_id: user.id,
      created_by: user.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  revalidatePath("/crm/contacts");
  return { id: data.id };
}
