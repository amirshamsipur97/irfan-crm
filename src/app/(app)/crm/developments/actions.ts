"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const BOARD_PATH = "/crm/developments";

/** whitelist of directly patchable crm_developments columns */
const PATCHABLE = new Set([
  "name",
  "owner_id",
  "developer_name",
  "status",
  "location",
  "completion_date",
  "description",
  "custom",
]);

export async function addDevelopment(groupId: string, name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { data, error } = await supabase
    .from("crm_developments")
    .insert({
      name: name.trim() || "New development",
      group_id: groupId,
      created_by: user.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return { id: data.id };
}

export async function updateDevelopment(developmentId: string, patch: Record<string, unknown>) {
  const entries = Object.entries(patch).filter(([k]) => PATCHABLE.has(k));
  if (entries.length === 0) return { error: "nothing to update" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_developments")
    .update(Object.fromEntries(entries))
    .eq("id", developmentId);
  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return {};
}

export async function addDevelopmentGroup(name: string, color: string) {
  const supabase = await createClient();

  const { data: last } = await supabase
    .from("crm_development_groups")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();

  const { data, error } = await supabase
    .from("crm_development_groups")
    .insert({ name, color, position: (last?.position ?? -1) + 1 })
    .select("id")
    .single<{ id: string }>();

  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return { id: data.id };
}

export async function renameDevelopmentGroup(groupId: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_development_groups")
    .update({ name: name.trim() || "New Group" })
    .eq("id", groupId);
  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return {};
}

export async function setDevelopmentGroupCollapsed(groupId: string, collapsed: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_development_groups")
    .update({ is_collapsed: collapsed })
    .eq("id", groupId);
  if (error) return { error: error.message };
  return {};
}

/** find-or-create used by pickers (Units board "Create development"). */
export async function quickCreateDevelopment(name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const clean = name.trim();
  if (!clean) return { error: "empty name" };

  const { data: existing } = await supabase
    .from("crm_developments")
    .select("id")
    .ilike("name", clean)
    .maybeSingle<{ id: string }>();
  if (existing) return { id: existing.id };

  const { data: group } = await supabase
    .from("crm_development_groups")
    .select("id")
    .order("position")
    .limit(1)
    .maybeSingle<{ id: string }>();

  const { data, error } = await supabase
    .from("crm_developments")
    .insert({ name: clean, group_id: group?.id ?? null, created_by: user.id })
    .select("id")
    .single<{ id: string }>();
  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return { id: data.id };
}
