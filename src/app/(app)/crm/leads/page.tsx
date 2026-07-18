import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { recordBoardVisit } from "@/lib/visits";
import { LeadsBoard } from "@/components/crm/leads/LeadsBoard";
import type { CrmLead, CrmLeadGroup, CrmStage, CrmUser } from "@/lib/types";

export default async function LeadsBoardPage() {
  const [profile, supabase] = await Promise.all([getProfile(), createClient(), recordBoardVisit("leads")]);

  const [{ data: groups }, { data: leads }, { data: stages }, { data: users }] =
    await Promise.all([
      supabase
        .from("crm_lead_groups")
        .select("*")
        .order("position")
        .returns<CrmLeadGroup[]>(),
      supabase
        .from("crm_leads")
        .select("*")
        .eq("is_archived", false)
        .order("created_at")
        .returns<CrmLead[]>(),
      supabase.from("crm_stages").select("*").order("position").returns<CrmStage[]>(),
      supabase
        .from("crm_users")
        .select("*")
        .eq("is_active", true)
        .order("full_name")
        .returns<CrmUser[]>(),
    ]);

  return (
    <LeadsBoard
      profile={profile}
      groups={groups ?? []}
      leads={leads ?? []}
      stages={stages ?? []}
      users={users ?? []}
    />
  );
}
