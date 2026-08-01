"use server";

import { revalidatePath } from "next/cache";
import { PERMISSION_ERROR } from "@/lib/mutate";
import { createClient } from "@/lib/supabase/server";

const BOARD_PATH = "/crm/accounts";

/** whitelist of directly patchable crm_accounts columns */
const PATCHABLE = new Set([
  "name",
  "owner_id",
  "domain",
  "email",
  "email_label",
  "industries",
  "description",
  "employees_range",
  "hq_location",
  "default_downpayment_percent",
  "last_interaction_at",
  "custom",
]);

export async function addAccount(groupId: string, name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { data, error } = await supabase
    .from("crm_accounts")
    .insert({
      name: name.trim() || "New account",
      group_id: groupId,
      owner_id: user.id,
      created_by: user.id,
    })
    .select("*")
    .single<Record<string, unknown>>();

  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return { id: data.id as string, row: data };
}

export async function updateAccount(accountId: string, patch: Record<string, unknown>) {
  const entries = Object.entries(patch).filter(([k]) => PATCHABLE.has(k));
  if (entries.length === 0) return { error: "nothing to update" };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_accounts")
    .update(Object.fromEntries(entries), { count: "exact" })
    .eq("id", accountId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  revalidatePath(BOARD_PATH);
  return {};
}

export async function addAccountGroup(name: string, color: string) {
  const supabase = await createClient();

  const { data: last } = await supabase
    .from("crm_account_groups")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();

  const { data, error } = await supabase
    .from("crm_account_groups")
    .insert({ name, color, position: (last?.position ?? -1) + 1 })
    .select("id")
    .single<{ id: string }>();

  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return { id: data.id };
}

export async function renameAccountGroup(groupId: string, name: string) {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_account_groups")
    .update({ name: name.trim() || "New Group" }, { count: "exact" })
    .eq("id", groupId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  revalidatePath(BOARD_PATH);
  return {};
}

/** Log a meeting / call / note / email from a accounts row's Activities timeline. */
export async function logAccountActivity(
  rowId: string,
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

  const [{ data: row }, { data: group }] = await Promise.all([
    supabase.from("crm_accounts").select("name").eq("id", rowId).maybeSingle<{ name: string }>(),
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
    related_item: row?.name ?? null,
    created_by: user.id,
  });
  if (error) return { error: error.message };

  const { error: rowError } = await supabase
    .from("crm_accounts")
    .update({ last_interaction_at: input.startAt ?? new Date().toISOString() })
    .eq("id", rowId);
  if (rowError) return { error: rowError.message };

  revalidatePath(BOARD_PATH);
  revalidatePath("/crm/activities");
  return {};
}
