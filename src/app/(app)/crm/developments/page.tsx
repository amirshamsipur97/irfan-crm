import { createClient } from "@/lib/supabase/server";
import type { CrmCustomColumn } from "@/lib/custom-columns";
import { getProfile } from "@/lib/profile";
import { recordBoardVisit } from "@/lib/visits";
import { DevelopmentsBoard } from "@/components/crm/developments/DevelopmentsBoard";
import type {
  CrmAccount,
  CrmDevelopment,
  CrmDevelopmentGroup,
  CrmUnit,
  CrmUser,
} from "@/lib/types";

export default async function DevelopmentsBoardPage() {
  const [profile, supabase] = await Promise.all([
    getProfile(),
    createClient(),
    recordBoardVisit("developments"),
  ]);

  const [{ data: groups }, { data: developments }, { data: units }, { data: users }, { data: accounts }, { data: customColumns }] =
    await Promise.all([
      supabase
        .from("crm_development_groups")
        .select("*")
        .order("position")
        .returns<CrmDevelopmentGroup[]>(),
      supabase.from("crm_developments").select("*").order("created_at").returns<CrmDevelopment[]>(),
      supabase.from("crm_units").select("*").returns<CrmUnit[]>(),
      supabase
        .from("crm_users")
        .select("*")
        .eq("is_active", true)
        .order("full_name")
        .returns<CrmUser[]>(),
      supabase.from("crm_accounts").select("*").order("name").returns<CrmAccount[]>(),
    supabase
      .from("crm_custom_columns")
      .select("*")
      .eq("board_key", "developments")
      .order("position")
      .returns<CrmCustomColumn[]>(),
  ]);

  return (
    <DevelopmentsBoard
      profile={profile}
      groups={groups ?? []}
      developments={developments ?? []}
      units={units ?? []}
      users={users ?? []}
      accounts={accounts ?? []}
      customColumns={customColumns ?? []}
    />
  );
}
