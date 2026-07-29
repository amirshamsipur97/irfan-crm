"use server";

import { revalidatePath } from "next/cache";
import { PERMISSION_ERROR } from "@/lib/mutate";
import { createClient } from "@/lib/supabase/server";

const BOARD_PATH = "/crm/leads";

export async function addLead(groupId: string, name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { data: pipeline } = await supabase
    .from("crm_pipelines")
    .select("id")
    .order("position")
    .limit(1)
    .single<{ id: string }>();
  if (!pipeline) return { error: "no pipeline configured" };

  const { data: stage } = await supabase
    .from("crm_stages")
    .select("id")
    .eq("pipeline_id", pipeline.id)
    .order("position")
    .limit(1)
    .single<{ id: string }>();
  if (!stage) return { error: "no stages configured" };

  const { data, error } = await supabase
    .from("crm_leads")
    .insert({
      name: name.trim() || "New Lead",
      pipeline_id: pipeline.id,
      stage_id: stage.id,
      group_id: groupId,
      source: "manual",
      created_by: user.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return { id: data.id };
}

export async function addGroup(name: string, color: string) {
  const supabase = await createClient();

  const { data: last } = await supabase
    .from("crm_lead_groups")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();

  const { data, error } = await supabase
    .from("crm_lead_groups")
    .insert({ name, color, position: (last?.position ?? -1) + 1 })
    .select("id")
    .single<{ id: string }>();

  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return { id: data.id };
}

export async function renameGroup(groupId: string, name: string) {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_lead_groups")
    .update({ name: name.trim() || "New Group" }, { count: "exact" })
    .eq("id", groupId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  revalidatePath(BOARD_PATH);
  return {};
}

export async function updateLeadStage(leadId: string, stageId: string) {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_leads")
    .update({ stage_id: stageId }, { count: "exact" })
    .eq("id", leadId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  revalidatePath(BOARD_PATH);
  return {};
}

export async function updateLeadOwner(leadId: string, ownerId: string | null) {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_leads")
    .update({ owner_id: ownerId }, { count: "exact" })
    .eq("id", leadId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  revalidatePath(BOARD_PATH);
  return {};
}

export async function renameLead(leadId: string, name: string) {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_leads")
    .update({ name: name.trim() || "New Lead" }, { count: "exact" })
    .eq("id", leadId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  revalidatePath(BOARD_PATH);
  return {};
}

/** Log a meeting / call / note / email from a lead's Activities timeline. */
export async function logLeadActivity(
  leadId: string,
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

  const [{ data: lead }, { data: group }] = await Promise.all([
    supabase
      .from("crm_leads")
      .select("name")
      .eq("id", leadId)
      .maybeSingle<{ name: string }>(),
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
    related_item: lead?.name ?? null,
    created_by: user.id,
  });
  if (error) return { error: error.message };

  const { error: leadError } = await supabase
    .from("crm_leads")
    .update({ last_activity_at: input.startAt ?? new Date().toISOString() })
    .eq("id", leadId);
  if (leadError) return { error: leadError.message };

  revalidatePath(BOARD_PATH);
  revalidatePath("/crm/activities");
  return {};
}

/** whitelist of directly patchable crm_leads columns */
const LEAD_PATCHABLE = new Set([
  "first_name",
  "last_name",
  "notes",
  "lead_date",
  "email",
  "phone",
  "country_code",
  "company",
  "title",
  "source",
  "priority",
  "budget",
  "last_activity_at",
  "custom",
]);

export async function updateLead(leadId: string, patch: Record<string, unknown>) {
  const entries = Object.entries(patch).filter(([k]) => LEAD_PATCHABLE.has(k));
  if (entries.length === 0) return { error: "nothing to update" };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_leads")
    .update(Object.fromEntries(entries), { count: "exact" })
    .eq("id", leadId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  revalidatePath(BOARD_PATH);
  return {};
}

/** Copy the lead into the Contacts board and mark it as moved (green check). */
/**
 * Standard lead conversion (Phase 1): transactional + idempotent RPC that
 * matches an existing contact by normalized phone/email before creating one,
 * and records converted_contact_id / converted_at on the lead.
 */
export async function moveLeadToContacts(leadId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crm_convert_lead", { p_lead_id: leadId });
  if (error) return { error: error.message };

  const result = (data ?? {}) as { error?: string; matched?: boolean; contact_id?: string };
  if (result.error) return { error: result.error };

  revalidatePath(BOARD_PATH);
  revalidatePath("/crm/contacts");
  return { matched: result.matched ?? false, contactId: result.contact_id };
}
