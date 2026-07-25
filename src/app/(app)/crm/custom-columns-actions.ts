"use server";

import { revalidatePath } from "next/cache";
import { PERMISSION_ERROR } from "@/lib/mutate";
import { createClient } from "@/lib/supabase/server";
import type { CustomColumnType } from "@/lib/custom-columns";
import { DEFAULT_OPTIONS, DEFAULT_LABELS } from "@/lib/custom-columns";

const BOARD_PATHS: Record<string, string> = {
  contacts: "/crm/contacts",
  leads: "/crm/leads",
  deals: "/crm/deals",
  accounts: "/crm/accounts",
  projects: "/crm/projects",
  activities: "/crm/activities",
  developments: "/crm/developments",
  units: "/crm/units",
  viewings: "/crm/viewings",
};

export async function addCustomColumn(boardKey: string, type: CustomColumnType) {
  const path = BOARD_PATHS[boardKey];
  if (!path) return { error: "unknown board" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { data: last } = await supabase
    .from("crm_custom_columns")
    .select("position")
    .eq("board_key", boardKey)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();

  // stable unique key per board (label stays editable independently)
  const key = `${type}_${Date.now().toString(36)}`;

  const { data, error } = await supabase
    .from("crm_custom_columns")
    .insert({
      board_key: boardKey,
      key,
      label: DEFAULT_LABELS[type],
      type,
      options: DEFAULT_OPTIONS[type] ?? null,
      position: (last?.position ?? -1) + 1,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) return { error: error.message };
  revalidatePath(path);
  return { column: data };
}

export async function renameCustomColumn(columnId: string, label: string, boardKey: string) {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_custom_columns")
    .update({ label: label.trim() || "Column" }, { count: "exact" })
    .eq("id", columnId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  if (BOARD_PATHS[boardKey]) revalidatePath(BOARD_PATHS[boardKey]);
  return {};
}

/** Admin-tier only (RLS enforces); row values stay in `custom` untouched. */
export async function deleteCustomColumn(columnId: string, boardKey: string) {
  const supabase = await createClient();
  const { error, count } = await supabase.from("crm_custom_columns").delete({ count: "exact" }).eq("id", columnId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  if (BOARD_PATHS[boardKey]) revalidatePath(BOARD_PATHS[boardKey]);
  return {};
}
