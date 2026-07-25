import { createClient } from "@/lib/supabase/server";
import { withCollapsePrefs } from "@/lib/group-prefs";
import type { CrmCustomColumn } from "@/lib/custom-columns";
import { getProfile } from "@/lib/profile";
import { recordBoardVisit } from "@/lib/visits";
import { ProjectsBoard } from "@/components/crm/projects/ProjectsBoard";
import type { CrmProject, CrmProjectGroup, CrmUser } from "@/lib/types";

export default async function ProjectsBoardPage() {
  const [profile, supabase] = await Promise.all([getProfile(), createClient(), recordBoardVisit("projects")]);

  const [{ data: groups }, { data: projects }, { data: users }, { data: customColumns }] = await Promise.all([
    supabase
      .from("crm_project_groups")
      .select("*")
      .order("position")
      .returns<CrmProjectGroup[]>(),
    supabase.from("crm_projects").select("*").order("position").returns<CrmProject[]>(),
    supabase
      .from("crm_users")
      .select("*")
      .eq("is_active", true)
      .order("full_name")
      .returns<CrmUser[]>(),
  supabase
      .from("crm_custom_columns")
      .select("*")
      .eq("board_key", "projects")
      .order("position")
      .returns<CrmCustomColumn[]>(),
  ]);

  return (
    <ProjectsBoard
      profile={profile}
      groups={await withCollapsePrefs("projects", groups ?? [])}
      projects={projects ?? []}
      users={users ?? []}
      customColumns={customColumns ?? []}
    />
  );
}
