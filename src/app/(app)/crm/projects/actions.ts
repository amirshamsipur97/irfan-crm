"use server";

import { revalidatePath } from "next/cache";
import { PERMISSION_ERROR } from "@/lib/mutate";
import { createClient } from "@/lib/supabase/server";

const BOARD_PATH = "/crm/projects";

/** whitelist of directly patchable crm_projects columns */
const PATCHABLE = new Set([
  "name",
  "owner_id",
  "status",
  "priority",
  "start_date",
  "end_date",
  "project_value",
  "account_name",
  "notes",
  "last_interaction_at",
  "custom",
]);

export async function addProject(groupId: string, name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { data, error } = await supabase
    .from("crm_projects")
    .insert({
      name: name.trim() || "New project",
      group_id: groupId,
      created_by: user.id,
    })
    .select("*")
    .single<Record<string, unknown>>();

  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return { id: data.id as string, row: data };
}

export async function updateProject(projectId: string, patch: Record<string, unknown>) {
  const entries = Object.entries(patch).filter(([k]) => PATCHABLE.has(k));
  if (entries.length === 0) return { error: "nothing to update" };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_projects")
    .update(Object.fromEntries(entries), { count: "exact" })
    .eq("id", projectId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  revalidatePath(BOARD_PATH);
  return {};
}

export async function addProjectGroup(name: string, color: string) {
  const supabase = await createClient();

  const { data: last } = await supabase
    .from("crm_project_groups")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();

  const { data, error } = await supabase
    .from("crm_project_groups")
    .insert({ name, color, position: (last?.position ?? -1) + 1 })
    .select("id")
    .single<{ id: string }>();

  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return { id: data.id };
}

export async function renameProjectGroup(groupId: string, name: string) {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_project_groups")
    .update({ name: name.trim() || "New Group" }, { count: "exact" })
    .eq("id", groupId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  revalidatePath(BOARD_PATH);
  return {};
}

