import { createClient } from "@/lib/supabase/server";
import type { CrmCustomColumn } from "@/lib/custom-columns";
import { getProfile } from "@/lib/profile";
import { recordBoardVisit } from "@/lib/visits";
import { UnitsBoard } from "@/components/crm/units/UnitsBoard";
import type { CrmDevelopment, CrmUnit, CrmUnitGroup, CrmUser } from "@/lib/types";

export default async function UnitsBoardPage() {
  const [profile, supabase] = await Promise.all([
    getProfile(),
    createClient(),
    recordBoardVisit("units"),
  ]);

  const [{ data: groups }, { data: units }, { data: users }, { data: developments }, { data: customColumns }] =
    await Promise.all([
      supabase.from("crm_unit_groups").select("*").order("position").returns<CrmUnitGroup[]>(),
      supabase.from("crm_units").select("*").order("position").returns<CrmUnit[]>(),
      supabase
        .from("crm_users")
        .select("*")
        .eq("is_active", true)
        .order("full_name")
        .returns<CrmUser[]>(),
      supabase.from("crm_developments").select("*").order("name").returns<CrmDevelopment[]>(),
    supabase
      .from("crm_custom_columns")
      .select("*")
      .eq("board_key", "units")
      .order("position")
      .returns<CrmCustomColumn[]>(),
  ]);

  return (
    <UnitsBoard
      profile={profile}
      groups={groups ?? []}
      units={units ?? []}
      users={users ?? []}
      developments={developments ?? []}
      customColumns={customColumns ?? []}
    />
  );
}
