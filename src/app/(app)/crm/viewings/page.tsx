import { createClient } from "@/lib/supabase/server";
import type { CrmCustomColumn } from "@/lib/custom-columns";
import { getProfile } from "@/lib/profile";
import { recordBoardVisit } from "@/lib/visits";
import { ViewingsBoard } from "@/components/crm/viewings/ViewingsBoard";
import type { CrmContact, CrmUnit, CrmUser, CrmViewing, CrmViewingGroup } from "@/lib/types";

export default async function ViewingsBoardPage() {
  const [profile, supabase] = await Promise.all([
    getProfile(),
    createClient(),
    recordBoardVisit("viewings"),
  ]);

  const [{ data: groups }, { data: viewings }, { data: users }, { data: contacts }, { data: units }, { data: customColumns }] =
    await Promise.all([
      supabase
        .from("crm_viewing_groups")
        .select("*")
        .order("position")
        .returns<CrmViewingGroup[]>(),
      supabase.from("crm_viewings").select("*").order("created_at").returns<CrmViewing[]>(),
      supabase
        .from("crm_users")
        .select("*")
        .eq("is_active", true)
        .order("full_name")
        .returns<CrmUser[]>(),
      supabase.from("crm_contacts").select("*").order("name").returns<CrmContact[]>(),
      supabase.from("crm_units").select("*").order("name").returns<CrmUnit[]>(),
    supabase
      .from("crm_custom_columns")
      .select("*")
      .eq("board_key", "viewings")
      .order("position")
      .returns<CrmCustomColumn[]>(),
  ]);

  return (
    <ViewingsBoard
      profile={profile}
      groups={groups ?? []}
      viewings={viewings ?? []}
      users={users ?? []}
      contacts={contacts ?? []}
      units={units ?? []}
      customColumns={customColumns ?? []}
    />
  );
}
