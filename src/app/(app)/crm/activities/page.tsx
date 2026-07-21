import { createClient } from "@/lib/supabase/server";
import type { CrmCustomColumn } from "@/lib/custom-columns";
import { getProfile } from "@/lib/profile";
import { recordBoardVisit } from "@/lib/visits";
import { ActivitiesBoard } from "@/components/crm/activities/ActivitiesBoard";
import type { CrmActivityGroup, CrmActivityItem, CrmUser } from "@/lib/types";

export default async function ActivitiesBoardPage() {
  const [profile, supabase] = await Promise.all([getProfile(), createClient(), recordBoardVisit("activities")]);

  const [{ data: groups }, { data: activities }, { data: users }, { data: customColumns }] = await Promise.all([
    supabase
      .from("crm_activity_groups")
      .select("*")
      .order("position")
      .returns<CrmActivityGroup[]>(),
    supabase
      .from("crm_activity_items")
      .select("*")
      .order("position")
      .returns<CrmActivityItem[]>(),
    supabase
      .from("crm_users")
      .select("*")
      .eq("is_active", true)
      .order("full_name")
      .returns<CrmUser[]>(),
  supabase
      .from("crm_custom_columns")
      .select("*")
      .eq("board_key", "activities")
      .order("position")
      .returns<CrmCustomColumn[]>(),
  ]);

  return (
    <ActivitiesBoard
      profile={profile}
      groups={groups ?? []}
      activities={activities ?? []}
      users={users ?? []}
      customColumns={customColumns ?? []}
    />
  );
}
