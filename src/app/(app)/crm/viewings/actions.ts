"use server";

import { revalidatePath } from "next/cache";
import { PERMISSION_ERROR } from "@/lib/mutate";
import { createClient } from "@/lib/supabase/server";

const BOARD_PATH = "/crm/viewings";

/** whitelist of directly patchable crm_viewings columns */
const PATCHABLE = new Set([
  "name",
  "agent_id",
  "contact_name",
  "unit_name",
  "deal_name",
  "scheduled_start",
  "scheduled_end",
  "status",
  "feedback",
  "custom",
]);

export async function addViewing(groupId: string, name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { data, error } = await supabase
    .from("crm_viewings")
    .insert({
      name: name.trim() || "New viewing",
      group_id: groupId,
      agent_id: user.id,
      created_by: user.id,
    })
    .select("*")
    .single<Record<string, unknown>>();

  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return { id: data.id as string, row: data };
}

export async function updateViewing(viewingId: string, patch: Record<string, unknown>) {
  const entries = Object.entries(patch).filter(([k]) => PATCHABLE.has(k));
  if (entries.length === 0) return { error: "nothing to update" };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_viewings")
    .update(Object.fromEntries(entries), { count: "exact" })
    .eq("id", viewingId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  revalidatePath(BOARD_PATH);
  return {};
}

export async function addViewingGroup(name: string, color: string) {
  const supabase = await createClient();

  const { data: last } = await supabase
    .from("crm_viewing_groups")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();

  const { data, error } = await supabase
    .from("crm_viewing_groups")
    .insert({ name, color, position: (last?.position ?? -1) + 1 })
    .select("id")
    .single<{ id: string }>();

  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return { id: data.id };
}

export async function renameViewingGroup(groupId: string, name: string) {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_viewing_groups")
    .update({ name: name.trim() || "New Group" }, { count: "exact" })
    .eq("id", groupId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  revalidatePath(BOARD_PATH);
  return {};
}

/** Delete an EMPTY group (admin tier by RLS) — rows must move out first. */
export async function deleteViewingGroup(groupId: string) {
  const supabase = await createClient();
  const { count: rows } = await supabase
    .from("crm_viewings")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId);
  if (rows)
    return { error: `This group still holds ${rows} viewing${rows === 1 ? "" : "s"} — move or delete them first.` };
  const { count: total } = await supabase
    .from("crm_viewing_groups")
    .select("id", { count: "exact", head: true });
  if ((total ?? 0) <= 1) return { error: "At least one group must remain." };
  const { error, count } = await supabase
    .from("crm_viewing_groups")
    .delete({ count: "exact" })
    .eq("id", groupId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  revalidatePath(BOARD_PATH);
  return {};
}

