import { createClient } from "@/lib/supabase/server";
import { withCollapsePrefs } from "@/lib/group-prefs";
import type { CrmCustomColumn } from "@/lib/custom-columns";
import { getProfile } from "@/lib/profile";
import { recordBoardVisit } from "@/lib/visits";
import { LeadsBoard } from "@/components/crm/leads/LeadsBoard";
import type { CrmLead, CrmLeadGroup, CrmStage, CrmUnit, CrmUser } from "@/lib/types";

export default async function LeadsBoardPage() {
  const [profile, supabase] = await Promise.all([getProfile(), createClient(), recordBoardVisit("leads")]);

  const [{ data: groups }, { data: leads }, { data: stages }, { data: users }, { data: units }, { data: customColumns }, { data: doneDeals }] =
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
        .order("position")
        .returns<CrmLead[]>(),
      supabase.from("crm_stages").select("*").order("position").returns<CrmStage[]>(),
      supabase
        .from("crm_users")
        .select("*")
        .eq("is_active", true)
        .order("full_name")
        .returns<CrmUser[]>(),
      supabase.from("crm_units").select("*").order("name").returns<CrmUnit[]>(),
      supabase
        .from("crm_custom_columns")
        .select("*")
        .eq("board_key", "leads")
        .order("position")
        .returns<CrmCustomColumn[]>(),
      // contacts whose deal completed its downpayment — lights the lead's badge
      supabase
        .from("crm_deals")
        .select("contact_id")
        .not("downpayment_completed_at", "is", null)
        .not("contact_id", "is", null)
        .returns<{ contact_id: string }[]>(),
    ]);

  return (
    <LeadsBoard
      profile={profile}
      groups={await withCollapsePrefs("leads", groups ?? [])}
      leads={leads ?? []}
      stages={stages ?? []}
      users={users ?? []}
      units={units ?? []}
      customColumns={customColumns ?? []}
      doneContactIds={(doneDeals ?? []).map((d) => d.contact_id)}
    />
  );
}
