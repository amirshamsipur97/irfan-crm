import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { isFullAccess } from "@/lib/permissions";
import { CollaborationBoard } from "@/components/crm/collaboration/CollaborationBoard";
import type { CrmUser } from "@/lib/types";
import { listCollaborationData } from "./actions";

export default async function CollaborationPage() {
  const [profile, supabase, data] = await Promise.all([getProfile(), createClient(), listCollaborationData()]);
  const { data: users } = await supabase.from("crm_users").select("*").order("full_name").returns<CrmUser[]>();
  // developer + CEO: every request and every duplicate-number attempt (crm_is_admin)
  return <CollaborationBoard profile={profile} users={users ?? []} isAdmin={isFullAccess(profile.role)} initial={data} />;
}
