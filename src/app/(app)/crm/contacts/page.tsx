import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { recordBoardVisit } from "@/lib/visits";
import { ContactsBoard } from "@/components/crm/contacts/ContactsBoard";
import type { CrmAccount, CrmContact, CrmContactGroup, CrmDeal, CrmUser } from "@/lib/types";

export default async function ContactsBoardPage() {
  const [profile, supabase] = await Promise.all([getProfile(), createClient(), recordBoardVisit("contacts")]);

  const [{ data: groups }, { data: contacts }, { data: deals }, { data: users }, { data: accounts }] =
    await Promise.all([
      supabase
        .from("crm_contact_groups")
        .select("*")
        .order("position")
        .returns<CrmContactGroup[]>(),
      supabase.from("crm_contacts").select("*").order("created_at").returns<CrmContact[]>(),
      supabase
        .from("crm_deals")
        .select("*")
        .order("created_at")
        .returns<CrmDeal[]>(),
      supabase
        .from("crm_users")
        .select("*")
        .eq("is_active", true)
        .order("full_name")
        .returns<CrmUser[]>(),
      supabase.from("crm_accounts").select("*").order("name").returns<CrmAccount[]>(),
    ]);

  return (
    <ContactsBoard
      profile={profile}
      groups={groups ?? []}
      contacts={contacts ?? []}
      deals={deals ?? []}
      users={users ?? []}
      accounts={accounts ?? []}
    />
  );
}
