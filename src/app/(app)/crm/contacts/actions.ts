"use server";

import { revalidatePath } from "next/cache";
import { PERMISSION_ERROR } from "@/lib/mutate";
import { createClient } from "@/lib/supabase/server";

const BOARD_PATH = "/crm/contacts";

/** whitelist of directly patchable crm_contacts columns */
const PATCHABLE = new Set([
  "name",
  "owner_id",
  "email",
  "email_label",
  "phone",
  "country_code",
  "country",
  "title",
  "contact_type",
  "priority",
  "comments",
  "account_name",
  "custom",
  "last_interaction_at",
  // carried over from the lead
  "first_name",
  "last_name",
  "notes",
  "lead_source",
  "lead_date",
  // the client's demand, editable straight from the board
  "property_type",
  "bedrooms",
  "budget",
  "preferred_area",
  "requirements",
]);

export async function addContact(groupId: string, name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { data, error } = await supabase
    .from("crm_contacts")
    .insert({
      name: name.trim() || "New Contact",
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

export async function updateContact(contactId: string, patch: Record<string, unknown>) {
  const entries = Object.entries(patch).filter(([k]) => PATCHABLE.has(k));
  if (entries.length === 0) return { error: "nothing to update" };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_contacts")
    .update(Object.fromEntries(entries), { count: "exact" })
    .eq("id", contactId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  revalidatePath(BOARD_PATH);
  return {};
}

export async function addContactGroup(name: string, color: string) {
  const supabase = await createClient();

  const { data: last } = await supabase
    .from("crm_contact_groups")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();

  const { data, error } = await supabase
    .from("crm_contact_groups")
    .insert({ name, color, position: (last?.position ?? -1) + 1 })
    .select("id")
    .single<{ id: string }>();

  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return { id: data.id };
}

export async function renameContactGroup(groupId: string, name: string) {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_contact_groups")
    .update({ name: name.trim() || "New Group" }, { count: "exact" })
    .eq("id", groupId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  revalidatePath(BOARD_PATH);
  return {};
}

/** Log a meeting / call / note / email from a contacts row's Activities timeline. */
export async function logContactActivity(
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
    supabase.from("crm_contacts").select("name").eq("id", rowId).maybeSingle<{ name: string }>(),
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
    .from("crm_contacts")
    .update({ last_interaction_at: input.startAt ?? new Date().toISOString() })
    .eq("id", rowId);
  if (rowError) return { error: rowError.message };

  revalidatePath(BOARD_PATH);
  revalidatePath("/crm/activities");
  return {};
}

/** Duplicate warning (Phase 1): find another contact with the same normalized email/phone. */
export async function findDuplicateContact(
  email: string | null,
  phone: string | null,
  excludeId: string | null
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crm_find_duplicate_contact", {
    p_email: email,
    p_phone: phone,
    p_exclude: excludeId,
  });
  if (error || !data) return null;
  return data as { id: string; name: string } | null;
}
