"use server";

import { revalidatePath } from "next/cache";
import { PERMISSION_ERROR } from "@/lib/mutate";
import { createClient } from "@/lib/supabase/server";

/** boardKey → backing table (allow-list; never accept table names from the client). */
const BOARD_TABLES: Record<string, string> = {
  leads: "crm_leads",
  offers: "crm_deals",
  deals: "crm_deals",
  contacts: "crm_contacts",
  accounts: "crm_accounts",
  projects: "crm_projects",
  activities: "crm_activity_items",
  developments: "crm_developments",
  units: "crm_units",
  viewings: "crm_viewings",
};

/** Columns that must never be copied on duplicate (ids, timestamps, generated). */
const DUP_EXCLUDE = new Set([
  "id",
  "created_at",
  "updated_at",
  "normalized_email",
  "normalized_phone",
  "position",
  "assigned_at",
  "first_response_at",
  "scored_at",
  // derived from crm_deal_downpayments, which do NOT copy — a duplicate
  // carrying these would show "Complete ✓ / invoice sent" with no payments
  "downpayment_completed_at",
  "invoice_sent_at",
]);

function table(boardKey: string) {
  const t = BOARD_TABLES[boardKey];
  if (!t) throw new Error(`unknown board: ${boardKey}`);
  return t;
}

/** Drag-and-drop persistence: new fractional position and/or new group. */
export async function moveRow(
  boardKey: string,
  rowId: string,
  patch: { position?: number; group_id?: string }
) {
  const supabase = await createClient();
  const clean: Record<string, unknown> = {};
  if (typeof patch.position === "number" && Number.isFinite(patch.position))
    clean.position = patch.position;
  if (patch.group_id) clean.group_id = patch.group_id;
  if (Object.keys(clean).length === 0) return { error: "nothing to move" };

  const { error, count } = await supabase.from(table(boardKey)).update(clean, { count: "exact" }).eq("id", rowId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  revalidatePath(`/crm/${boardKey}`);
  return {};
}

/** Duplicate a row right below the original ("<name> (copy)"). */
export async function duplicateRow(boardKey: string, rowId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const t = table(boardKey);
  const { data: row, error: readError } = await supabase
    .from(t)
    .select("*")
    .eq("id", rowId)
    .maybeSingle<Record<string, unknown>>();
  if (readError) return { error: readError.message };
  if (!row) return { error: "row not found" };

  const copy: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (!DUP_EXCLUDE.has(k)) copy[k] = v;
  }
  if (typeof copy.name === "string") copy.name = `${copy.name} (copy)`;
  copy.position = ((row.position as number) ?? Date.now() / 1000) + 0.001;
  copy.created_by = user.id;

  const { data: inserted, error } = await supabase
    .from(t)
    .insert(copy)
    .select("*")
    .single<Record<string, unknown>>();
  if (error) return { error: error.message };
  revalidatePath(`/crm/${boardKey}`);
  return { row: inserted };
}

/** Permanently delete a row (RLS + audit triggers enforce and record it). */
export async function deleteRow(boardKey: string, rowId: string) {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from(table(boardKey))
    .delete({ count: "exact" })
    .eq("id", rowId);
  if (error) return { error: error.message };
  if (!count) return { error: "You don't have permission to delete this item" };
  revalidatePath(`/crm/${boardKey}`);
  return {};
}
