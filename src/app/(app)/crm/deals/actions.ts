"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const BOARD_PATH = "/crm/deals";

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
  "forecast_category",
  "last_interaction_at",
  "currency",
  "lost_reason",
  "next_step",
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
      name: name.trim() || "New Deal",
      group_id: groupId,
      stage_id: stage.id,
      created_by: user.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return { id: data.id };
}

export async function updateDeal(dealId: string, patch: Record<string, unknown>) {
  const entries = Object.entries(patch).filter(([k]) => PATCHABLE.has(k));
  if (entries.length === 0) return { error: "nothing to update" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_deals")
    .update(Object.fromEntries(entries))
    .eq("id", dealId);
  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
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
  const { error } = await supabase
    .from("crm_deal_groups")
    .update({ name: name.trim() || "New Group" })
    .eq("id", groupId);
  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return {};
}

export async function setDealGroupCollapsed(groupId: string, collapsed: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_deal_groups")
    .update({ is_collapsed: collapsed })
    .eq("id", groupId);
  if (error) return { error: error.message };
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
    created_by: user.id,
  });
  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  revalidatePath("/crm/contacts");
  return {};
}
