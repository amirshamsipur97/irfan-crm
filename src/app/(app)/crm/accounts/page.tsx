import { createClient } from "@/lib/supabase/server";
import { withCollapsePrefs } from "@/lib/group-prefs";
import type { CrmCustomColumn } from "@/lib/custom-columns";
import type { CrmUser } from "@/lib/types";
import { getProfile } from "@/lib/profile";
import { recordBoardVisit } from "@/lib/visits";
import { AccountsBoard } from "@/components/crm/accounts/AccountsBoard";
import type {
  CrmAccount,
  CrmAccountGroup,
  CrmContact,
  CrmDeal,
} from "@/lib/types";
import type { DevelopmentLink } from "@/components/crm/accounts/AccountsBoard";

export default async function AccountsBoardPage() {
  const [profile, supabase] = await Promise.all([getProfile(), createClient(), recordBoardVisit("accounts")]);

  const [{ data: groups }, { data: accounts }, { data: contacts }, { data: deals }, { data: customColumns }, { data: users }, { data: developments }] =
    await Promise.all([
      supabase
        .from("crm_account_groups")
        .select("*")
        .order("position")
        .returns<CrmAccountGroup[]>(),
      supabase.from("crm_accounts").select("*").order("position").returns<CrmAccount[]>(),
      supabase.from("crm_contacts").select("*").order("created_at").returns<CrmContact[]>(),
      supabase.from("crm_deals").select("*").order("created_at").returns<CrmDeal[]>(),
      supabase
        .from("crm_custom_columns")
        .select("*")
        .eq("board_key", "accounts")
        .order("position")
        .returns<CrmCustomColumn[]>(),
    supabase
        .from("crm_users")
        .select("*")
        .eq("is_active", true)
        .order("full_name")
        .returns<CrmUser[]>(),
      // the developer's projects, shown as a connected column
      supabase
        .from("crm_developments")
        .select("id, name, developer_account_id, developer_name, units_count")
        .order("name")
        .returns<DevelopmentLink[]>(),
    ]);

  return (
    <AccountsBoard
      profile={profile}
      groups={await withCollapsePrefs("accounts", groups ?? [])}
      accounts={accounts ?? []}
      contacts={contacts ?? []}
      deals={deals ?? []}
      customColumns={customColumns ?? []}
      users={users ?? []}
      developments={developments ?? []}
    />
  );
}
