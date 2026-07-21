import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { isFullAccess } from "@/lib/permissions";
import { Surface } from "@/components/shell/AppChrome";
import { TeamView } from "@/components/crm/team/TeamView";
import type { CrmInvite, CrmUser } from "@/lib/types";

/** Team & roles management — Developer and CEO only. */
export default async function TeamPage() {
  const profile = await getProfile();

  if (!isFullAccess(profile.role)) {
    return (
      <Surface>
        <div className="flex h-full items-center justify-center">
          <p className="font-sans text-[14px] text-ink-muted">
            Team management is only visible to Developer and CEO roles.
          </p>
        </div>
      </Surface>
    );
  }

  const supabase = await createClient();
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from("crm_users").select("*").order("created_at").returns<CrmUser[]>(),
    supabase
      .from("crm_invites")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<CrmInvite[]>(),
  ]);

  return <TeamView profile={profile} members={members ?? []} invites={invites ?? []} />;
}
