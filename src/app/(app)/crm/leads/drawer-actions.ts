"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CrmActivityItem, CrmLeadStageHistory, CrmPropertyInterest } from "@/lib/types";

const BOARD_PATH = "/crm/leads";

/** Everything the lead drawer shows, in one round trip. */
export async function getLeadRelations(leadId: string) {
  const supabase = await createClient();

  const [{ data: interests }, { data: history }, { data: lead }] = await Promise.all([
    supabase
      .from("crm_property_interests")
      .select("*, unit:crm_units(name, development_name)")
      .eq("lead_id", leadId)
      .order("created_at"),
    supabase
      .from("crm_lead_stage_history")
      .select("*")
      .eq("lead_id", leadId)
      .order("changed_at", { ascending: false })
      .limit(15)
      .returns<CrmLeadStageHistory[]>(),
    supabase.from("crm_leads").select("name").eq("id", leadId).maybeSingle<{ name: string }>(),
  ]);

  const { data: activities } = lead
    ? await supabase
        .from("crm_activity_items")
        .select("*")
        .eq("related_item", lead.name)
        .order("created_at", { ascending: false })
        .limit(20)
        .returns<CrmActivityItem[]>()
    : { data: [] as CrmActivityItem[] };

  type JoinedInterest = CrmPropertyInterest & {
    unit: { name: string; development_name: string | null } | null;
  };

  return {
    interests: ((interests ?? []) as unknown as JoinedInterest[]).map((i) => ({
      ...i,
      unit_name: i.unit?.name ?? null,
      development_name: i.unit?.development_name ?? null,
    })),
    history: history ?? [],
    activities: activities ?? [],
  };
}

/** Shortlist a unit for a lead (also feeds the scoring rules). */
export async function addLeadInterest(leadId: string, unitId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { data: unit } = await supabase
    .from("crm_units")
    .select("development_id")
    .eq("id", unitId)
    .maybeSingle<{ development_id: string | null }>();

  const { error } = await supabase.from("crm_property_interests").insert({
    lead_id: leadId,
    unit_id: unitId,
    development_id: unit?.development_id ?? null,
    status: "shortlisted",
    created_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath(BOARD_PATH);
  return {};
}

/** Drop a shortlisted unit from the lead. */
export async function setLeadInterestStatus(interestId: string, status: "active" | "shortlisted" | "rejected") {
  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_property_interests")
    .update({ status })
    .eq("id", interestId);
  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return {};
}
