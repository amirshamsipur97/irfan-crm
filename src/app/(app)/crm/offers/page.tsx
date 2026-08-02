import { createClient } from "@/lib/supabase/server";
import { withCollapsePrefs } from "@/lib/group-prefs";
import { getProfile } from "@/lib/profile";
import { recordBoardVisit } from "@/lib/visits";
import { DealsBoard } from "@/components/crm/deals/DealsBoard";
import type { CrmAccount, CrmContact, CrmDeal, CrmDealGroup, CrmDealStage, CrmUser } from "@/lib/types";
import type { CrmCustomColumn } from "@/lib/custom-columns";

export default async function OffersBoardPage() {
  const [profile, supabase] = await Promise.all([getProfile(), createClient(), recordBoardVisit("offers")]);

  const [{ data: groups }, { data: deals }, { data: stages }, { data: users }, { data: accounts }, { data: contacts }, { data: customColumns }] =
    await Promise.all([
      supabase
        .from("crm_deal_groups")
        .select("*")
        .order("position")
        .returns<CrmDealGroup[]>(),
      supabase.from("crm_deals").select("*").order("position").returns<CrmDeal[]>(),
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
      supabase
        .from("crm_custom_columns")
        .select("*")
        .eq("board_key", "offers")
        .order("position")
        .returns<CrmCustomColumn[]>(),
    ]);

  return (
    <DealsBoard
      profile={profile}
      groups={await withCollapsePrefs("offers", groups ?? [])}
      deals={deals ?? []}
      stages={stages ?? []}
      users={users ?? []}
      accounts={accounts ?? []}
      contacts={contacts ?? []}
      customColumns={customColumns ?? []}
    />
  );
}
