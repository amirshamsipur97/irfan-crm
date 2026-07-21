import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { recordBoardVisit } from "@/lib/visits";
import { DealsBoard } from "@/components/crm/deals/DealsBoard";
import type { CrmAccount, CrmContact, CrmDeal, CrmDealGroup, CrmDealStage, CrmUnit, CrmUser } from "@/lib/types";
import type { CrmCustomColumn } from "@/lib/custom-columns";

export default async function DealsBoardPage() {
  const [profile, supabase] = await Promise.all([getProfile(), createClient(), recordBoardVisit("deals")]);

  const [{ data: groups }, { data: deals }, { data: stages }, { data: users }, { data: accounts }, { data: contacts }, { data: units }, { data: customColumns }] =
    await Promise.all([
      supabase
        .from("crm_deal_groups")
        .select("*")
        .order("position")
        .returns<CrmDealGroup[]>(),
      supabase.from("crm_deals").select("*").order("created_at").returns<CrmDeal[]>(),
      supabase
        .from("crm_deal_stages")
        .select("*")
        .order("position")
        .returns<CrmDealStage[]>(),
      supabase
        .from("crm_users")
        .select("*")
        .eq("is_active", true)
        .order("full_name")
        .returns<CrmUser[]>(),
      supabase.from("crm_accounts").select("*").order("name").returns<CrmAccount[]>(),
      supabase.from("crm_contacts").select("*").order("name").returns<CrmContact[]>(),
      supabase.from("crm_units").select("*").order("name").returns<CrmUnit[]>(),
      supabase
        .from("crm_custom_columns")
        .select("*")
        .eq("board_key", "deals")
        .order("position")
        .returns<CrmCustomColumn[]>(),
    ]);

  return (
    <DealsBoard
      profile={profile}
      groups={groups ?? []}
      deals={deals ?? []}
      stages={stages ?? []}
      users={users ?? []}
      accounts={accounts ?? []}
      contacts={contacts ?? []}
      units={units ?? []}
      customColumns={customColumns ?? []}
    />
  );
}
