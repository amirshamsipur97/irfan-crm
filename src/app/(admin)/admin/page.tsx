import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { isFullAccess } from "@/lib/permissions";
import { BOARD_META } from "@/lib/boards";
import { AdminView, type AdminAuditRow, type AdminBoardStat } from "@/components/crm/admin/AdminView";
import type { CrmCustomColumn } from "@/lib/custom-columns";
import type { CrmInvite, CrmUser } from "@/lib/types";

interface RegistrationSettings {
  allowed_domains: string[];
  max_agents: number;
  updated_at: string;
}

/** Administration — Developer & CEO only (all tables are additionally RLS-gated). */
export default async function AdminPage() {
  const profile = await getProfile();
  if (!isFullAccess(profile.role)) redirect("/crm");

  const supabase = await createClient();
  const dataBoards = BOARD_META.filter((b) => b.table);

  const [
    { data: regSettings },
    { data: targets },
    { data: members },
    { data: invites },
    { data: customColumns },
    { data: audit },
    { data: usage },
  ] = await Promise.all([
    supabase.from("crm_registration_settings").select("*").maybeSingle<RegistrationSettings>(),
    supabase.from("crm_dashboard_settings").select("*").returns<{ key: string; value: number }[]>(),
    supabase.from("crm_users").select("*").order("created_at").returns<CrmUser[]>(),
    supabase
      .from("crm_invites")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<CrmInvite[]>(),
    supabase
      .from("crm_custom_columns")
      .select("*")
      .order("board_key")
      .order("position")
      .returns<CrmCustomColumn[]>(),
    supabase
      .from("crm_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<AdminAuditRow[]>(),
    supabase
      .rpc("crm_admin_usage_stats")
      .single<{ rows: Record<string, number>; visits: Record<string, number> }>(),
  ]);

  const boardStats: AdminBoardStat[] = dataBoards.map((b) => ({
    key: b.key,
    name: b.name,
    href: b.href,
    rows: usage?.rows?.[b.key] ?? 0,
    visits7d: usage?.visits?.[b.key] ?? 0,
  }));

  return (
    <AdminView
      profile={profile}
      registration={{
        allowedDomains: regSettings?.allowed_domains ?? [],
        maxAgents: regSettings?.max_agents ?? 20,
      }}
      targets={Object.fromEntries((targets ?? []).map((t) => [t.key, Number(t.value)]))}
      members={members ?? []}
      invites={invites ?? []}
      customColumns={customColumns ?? []}
      audit={audit ?? []}
      boardStats={boardStats}
    />
  );
}
