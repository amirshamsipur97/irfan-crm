import { createClient } from "@/lib/supabase/server";
import { withCollapsePrefs } from "@/lib/group-prefs";
import { getProfile } from "@/lib/profile";
import { getColumnOrder } from "@/app/(app)/crm/column-order-actions";
import { recordBoardVisit } from "@/lib/visits";
import { ContactsBoard } from "@/components/crm/contacts/ContactsBoard";
import type { CrmAccount, CrmContact, CrmContactGroup, CrmDeal, CrmDevelopment, CrmUser } from "@/lib/types";
import type { CrmCustomColumn } from "@/lib/custom-columns";

export default async function ContactsBoardPage() {
  const [profile, supabase] = await Promise.all([getProfile(), createClient(), recordBoardVisit("contacts")]);

  const [{ data: groups }, { data: contacts }, { data: deals }, { data: users }, { data: accounts }, { data: developments }, { data: customColumns }] =
    await Promise.all([
      supabase
        .from("crm_contact_groups")
        .select("*")
        .order("position")
        .returns<CrmContactGroup[]>(),
      supabase.from("crm_contacts").select("*").order("position").returns<CrmContact[]>(),
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
      // the first-negotiation popup suggests an alternative from these — every
      // project of every developer company on the Accounts register
      supabase
        .from("crm_developments")
        .select("id, name, developer_name")
        .order("name")
        .returns<Pick<CrmDevelopment, "id" | "name" | "developer_name">[]>(),
      supabase
        .from("crm_custom_columns")
        .select("*")
        .eq("board_key", "contacts")
        .order("position")
        .returns<CrmCustomColumn[]>(),
    ]);
  const columnOrder = await getColumnOrder("contacts");


  return (
    <ContactsBoard
      profile={profile}
      groups={await withCollapsePrefs("contacts", groups ?? [])}
      contacts={contacts ?? []}
      deals={deals ?? []}
      users={users ?? []}
      accounts={accounts ?? []}
      projects={(developments ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        developer: d.developer_name,
      }))}
      customColumns={customColumns ?? []}
      columnOrder={columnOrder}
    />
  );
}
