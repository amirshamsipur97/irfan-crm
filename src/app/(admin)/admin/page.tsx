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
  const since7d = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
  const dataBoards = BOARD_META.filter((b) => b.table);

  const [
    { data: regSettings },
    { data: targets },
    { data: members },
    { data: invites },
    { data: customColumns },
    { data: audit },
    counts,
    visits,
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
    Promise.all(
      dataBoards.map((b) =>
        supabase
          .from(b.table!)
          .select("id", { count: "exact", head: true })
          .then(({ count }) => count ?? 0)
      )
    ),
    Promise.all(
      dataBoards.map((b) =>
        supabase
          .from("crm_board_visits")
          .select("user_id", { count: "exact", head: true })
          .eq("board_key", b.key)
          .gte("visited_at", since7d)
          .then(({ count }) => count ?? 0)
      )
    ),
  ]);

  const boardStats: AdminBoardStat[] = dataBoards.map((b, i) => ({
    key: b.key,
    name: b.name,
    href: b.href,
    rows: counts[i],
    visits7d: visits[i],
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
