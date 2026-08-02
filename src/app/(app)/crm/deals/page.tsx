import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { recordBoardVisit } from "@/lib/visits";
import { AcceptedDealsBoard } from "@/components/crm/deals/AcceptedDealsBoard";
import type { CrmContact, CrmDeal, CrmDealDownpayment, CrmDealStage, CrmUser } from "@/lib/types";

/**
 * Deals — offers the client ACCEPTED (Move to deal on the Offers board).
 * Each row carries the client, the accepted offer, and the downpayment
 * tracker: percent → computed amount → part payments until complete.
 */
export default async function DealsBoardPage() {
  const [profile, supabase] = await Promise.all([getProfile(), createClient(), recordBoardVisit("deals")]);

  const [{ data: deals }, { data: contacts }, { data: users }, { data: payments }, { data: stages }] =
    await Promise.all([
      supabase
        .from("crm_deals")
        .select("*")
        .not("accepted_at", "is", null)
        .order("accepted_at", { ascending: false })
        .returns<CrmDeal[]>(),
      supabase.from("crm_contacts").select("*").order("name").returns<CrmContact[]>(),
      supabase
        .from("crm_users")
        .select("*")
        .eq("is_active", true)
        .order("full_name")
        .returns<CrmUser[]>(),
      supabase
        .from("crm_deal_downpayments")
        .select("*")
        .order("part_no")
        .returns<CrmDealDownpayment[]>(),
      // the shared deal drawer needs the stage list for its header pill
      supabase.from("crm_deal_stages").select("*").order("position").returns<CrmDealStage[]>(),
    ]);

  return (
    <AcceptedDealsBoard
      profile={profile}
      deals={deals ?? []}
      contacts={contacts ?? []}
      users={users ?? []}
      payments={payments ?? []}
      stages={stages ?? []}
    />
  );
}
