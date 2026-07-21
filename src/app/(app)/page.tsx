import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { HomeView, type HomeData } from "@/components/home/HomeView";
import type { CrmLead, CrmStage } from "@/lib/types";

function compactMoney(value: number): string {
  return `${new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)} OMR`;
}

function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function HomePage() {
  const [profile, supabase] = await Promise.all([getProfile(), createClient()]);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [{ data: stages }, { data: leads }, { data: wonThisMonth }] = await Promise.all([
    supabase.from("crm_stages").select("id, is_won, is_lost").returns<
      Pick<CrmStage, "id" | "is_won" | "is_lost">[]
    >(),
    supabase
      .from("crm_leads")
      .select("id, budget, stage_id")
      .eq("is_archived", false)
      .returns<Pick<CrmLead, "id" | "budget" | "stage_id">[]>(),
    supabase
      .from("crm_lead_stage_history")
      .select("lead_id, to_stage_id, changed_at")
      .gte("changed_at", monthStart.toISOString()),
  ]);

  const wonStages = new Set((stages ?? []).filter((s) => s.is_won).map((s) => s.id));
  const closedStages = new Set(
    (stages ?? []).filter((s) => s.is_won || s.is_lost).map((s) => s.id)
  );

  const openLeads = (leads ?? []).filter((l) => !closedStages.has(l.stage_id));
  const totalPipeline = openLeads.reduce((sum, l) => sum + (Number(l.budget) || 0), 0);

  const wonLeadIds = new Set(
    (wonThisMonth ?? []).filter((h) => wonStages.has(h.to_stage_id)).map((h) => h.lead_id)
  );
  const leadById = new Map((leads ?? []).map((l) => [l.id, l]));
  let closedWon = 0;
  for (const id of wonLeadIds) {
    const lead = leadById.get(id);
    if (lead && wonStages.has(lead.stage_id)) closedWon += Number(lead.budget) || 0;
  }

  const now = new Date();
  const data: HomeData = {
    firstName: (profile.full_name || profile.email).split(/\s+/)[0],
    fullName: profile.full_name || profile.email,
    avatarUrl: profile.avatar_url,
    dateLabel: now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    greeting: greetingFor(now.getHours()),
    totalPipelineLabel: compactMoney(totalPipeline),
    openDealsLabel: `${openLeads.length} open deal${openLeads.length === 1 ? "" : "s"}`,
    closedWonLabel: compactMoney(closedWon),
  };

  return <HomeView data={data} />;
}
