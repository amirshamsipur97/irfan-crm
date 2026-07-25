import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { canManageBoards } from "@/lib/permissions";
import { recordBoardVisit } from "@/lib/visits";
import {
  SalesDashboard,
  type DashboardData,
} from "@/components/crm/dashboard/SalesDashboard";
import { forecastValue } from "@/components/crm/deals/deals-config";
import type { CrmActivityItem, CrmDeal, CrmDealStage, CrmLead, CrmUser, CrmViewing } from "@/lib/types";

const MONTH_LABEL = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "long", year: "numeric" });

export default async function SalesDashboardPage() {
  const [profile, supabase] = await Promise.all([getProfile(), createClient(), recordBoardVisit("dashboard")]);

  const [{ data: deals }, { data: stages }, { data: activities }, { data: users }, { data: settings }, { data: leads }, { data: viewings }, { data: reg }] =
    await Promise.all([
      supabase.from("crm_deals").select("*").returns<CrmDeal[]>(),
      supabase.from("crm_deal_stages").select("*").order("position").returns<CrmDealStage[]>(),
      supabase.from("crm_activity_items").select("*").returns<CrmActivityItem[]>(),
      supabase.from("crm_users").select("*").eq("is_active", true).returns<CrmUser[]>(),
      supabase.from("crm_dashboard_settings").select("*").returns<{ key: string; value: number }[]>(),
      supabase.from("crm_leads").select("*").eq("is_archived", false).returns<CrmLead[]>(),
      supabase.from("crm_viewings").select("*").returns<CrmViewing[]>(),
      supabase
        .from("crm_registration_settings")
        .select("default_currency")
        .maybeSingle<{ default_currency: string }>(),
    ]);

  const allDeals = deals ?? [];
  const allStages = stages ?? [];
  const setting = (key: string, fallback: number) =>
    Number((settings ?? []).find((s) => s.key === key)?.value ?? fallback);

  const wonStageIds = new Set(allStages.filter((s) => s.is_won).map((s) => s.id));
  const lostStageIds = new Set(allStages.filter((s) => s.is_lost).map((s) => s.id));
  const stageById = new Map(allStages.map((s) => [s.id, s]));

  const wonDeals = allDeals.filter((d) => wonStageIds.has(d.stage_id));
  const activeDeals = allDeals.filter(
    (d) => !wonStageIds.has(d.stage_id) && !lostStageIds.has(d.stage_id)
  );

  const value = (d: CrmDeal) => Number(d.deal_value) || 0;
  const wonDate = (d: CrmDeal) =>
    d.expected_close_date ? new Date(d.expected_close_date + "T00:00:00") : new Date(d.updated_at);

  const now = new Date();
  const yearWon = wonDeals.filter((d) => wonDate(d).getFullYear() === now.getFullYear());
  const monthWon = yearWon.filter((d) => wonDate(d).getMonth() === now.getMonth());

  // average of every deal that has a value
  const valued = allDeals.filter((d) => d.deal_value != null);
  const avgDealValue =
    valued.length > 0 ? valued.reduce((s, d) => s + value(d), 0) / valued.length : 0;

  const activeForecast = activeDeals.reduce(
    (s, d) => s + forecastValue(value(d), d.close_probability ?? 0),
    0
  );

  // pie — deals per current stage
  const statusDistribution = allStages
    .map((s) => ({
      label: s.name,
      color: s.color,
      count: allDeals.filter((d) => d.stage_id === s.id).length,
    }))
    .filter((s) => s.count > 0);

  // actual revenue by month (won deals)
  const revenueMap = new Map<string, { label: string; value: number; ts: number }>();
  for (const d of wonDeals) {
    const dt = wonDate(d);
    const key = `${dt.getFullYear()}-${dt.getMonth()}`;
    const entry = revenueMap.get(key) ?? {
      label: MONTH_LABEL(dt),
      value: 0,
      ts: new Date(dt.getFullYear(), dt.getMonth(), 1).getTime(),
    };
    entry.value += value(d);
    revenueMap.set(key, entry);
  }
  const revenueByMonth = [...revenueMap.values()].sort((a, b) => a.ts - b.ts);

  // funnel — deals that reached each stage (current stage at-or-past it); Won = is_won
  const orderedStages = allStages.filter((s) => !s.is_lost);
  const reached = (position: number) =>
    allDeals.filter((d) => {
      const s = stageById.get(d.stage_id);
      return !!s && !s.is_lost && s.position >= position;
    }).length;
  const funnel = [
    { label: "New", count: allDeals.filter((d) => !lostStageIds.has(d.stage_id)).length, color: "#579bfc" },
    ...orderedStages.map((s) => ({
      label: s.name,
      count: reached(s.position),
      color: s.is_won ? "#00c875" : "#579bfc",
    })),
  ].filter((step, i) => !(i > 0 && step.label === "New"));
  const total = funnel[0]?.count ?? 0;
  const conversionToWon = total > 0 ? Math.round((wonDeals.length / total) * 100) : 0;

  // forecasted revenue by month (active deals, by expected close date)
  const forecastMap = new Map<string, { label: string; value: number; ts: number }>();
  for (const d of activeDeals) {
    if (!d.expected_close_date) continue;
    const dt = new Date(d.expected_close_date + "T00:00:00");
    const key = `${dt.getFullYear()}-${dt.getMonth()}`;
    const entry = forecastMap.get(key) ?? {
      label: MONTH_LABEL(dt),
      value: 0,
      ts: new Date(dt.getFullYear(), dt.getMonth(), 1).getTime(),
    };
    entry.value += forecastValue(value(d), d.close_probability ?? 0);
    forecastMap.set(key, entry);
  }
  const forecastByMonth = [...forecastMap.values()].sort((a, b) => a.ts - b.ts);

  const forecastByStage = allStages
    .filter((s) => !s.is_won && !s.is_lost)
    .map((s) => ({
      label: s.name,
      color: s.color,
      value: activeDeals
        .filter((d) => d.stage_id === s.id)
        .reduce((sum, d) => sum + forecastValue(value(d), d.close_probability ?? 0), 0),
    }))
    .filter((s) => s.value > 0);

  const userById = new Map((users ?? []).map((u) => [u.id, u]));
  const activityEvents = (activities ?? []).map((a) => ({
    owner:
      (a.owner_id && userById.get(a.owner_id)?.full_name) ||
      (a.created_by && userById.get(a.created_by)?.full_name) ||
      "Unassigned",
    type: a.activity_type ?? "note",
    at: a.start_at ?? a.created_at,
  }));

  // ---- Phase 4: SLA / my-work / team sections ----
  const nowMs = Date.now();
  const DAY = 86400000;
  const fmtWhen = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const myLeads = (leads ?? []).filter((l) => l.owner_id === profile.id || l.created_by === profile.id);

  const overdue = myLeads
    .filter((l) => l.next_followup_at && new Date(l.next_followup_at).getTime() < nowMs)
    .sort((a, b) => (a.next_followup_at! < b.next_followup_at! ? -1 : 1))
    .slice(0, 8)
    .map((l) => ({ primary: l.name, meta: `due ${fmtWhen(l.next_followup_at!)}`, tone: "alert" as const }));

  const quiet = myLeads
    .filter((l) => {
      const last = l.last_activity_at ?? l.created_at;
      return nowMs - new Date(last).getTime() > 7 * DAY && !l.converted_contact_id;
    })
    .slice(0, 8)
    .map((l) => {
      const last = l.last_activity_at ?? l.created_at;
      const days = Math.floor((nowMs - new Date(last).getTime()) / DAY);
      return { primary: l.name, meta: `${days}d quiet` };
    });

  const upcomingViewings = (viewings ?? [])
    .filter(
      (v) =>
        v.agent_id === profile.id &&
        v.scheduled_start &&
        new Date(v.scheduled_start).getTime() > nowMs - DAY &&
        new Date(v.scheduled_start).getTime() < nowMs + 7 * DAY &&
        ["requested", "scheduled", "confirmed"].includes(v.status)
    )
    .sort((a, b) => (a.scheduled_start! < b.scheduled_start! ? -1 : 1))
    .slice(0, 8)
    .map((v) => ({ primary: v.name, meta: fmtWhen(v.scheduled_start!) }));

  let team: DashboardData["team"] = null;
  if (canManageBoards(profile.role)) {
    const responded = (leads ?? []).filter((l) => l.first_response_at);
    const avgMs =
      responded.length > 0
        ? responded.reduce((s, l) => {
            const start = new Date(l.assigned_at ?? l.created_at).getTime();
            return s + Math.max(0, new Date(l.first_response_at!).getTime() - start);
          }, 0) / responded.length
        : null;

    const openLeads = (leads ?? []).filter((l) => !l.converted_contact_id);
    const byOwner = new Map<string, number>();
    for (const l of openLeads) {
      const name = (l.owner_id && userById.get(l.owner_id)?.full_name) || "Unassigned";
      byOwner.set(name, (byOwner.get(name) ?? 0) + 1);
    }

    const reasons = new Map<string, number>();
    for (const d of allDeals) {
      if (lostStageIds.has(d.stage_id) && d.lost_reason) {
        reasons.set(d.lost_reason, (reasons.get(d.lost_reason) ?? 0) + 1);
      }
    }

    team = {
      avgFirstResponseHours: avgMs == null ? null : avgMs / 3600000,
      leadsByOwner: [...byOwner.entries()].map(([label, value]) => ({ label, value })),
      lostReasons: [...reasons.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([label, count]) => ({ primary: label, meta: `${count}×` })),
    };
  }

  const data: DashboardData = {
    myWork: { overdue, quiet, viewings: upcomingViewings },
    team,
    annual: { actual: yearWon.reduce((s, d) => s + value(d), 0), target: setting("annual_target", 100000) },
    monthly: { actual: monthWon.reduce((s, d) => s + value(d), 0), target: setting("monthly_target", 10000) },
    avgDealValue,
    activeForecast,
    statusDistribution,
    revenueByMonth,
    funnel,
    conversionToWon,
    forecastByMonth,
    forecastGoal: setting("forecast_goal", 120000),
    forecastByStage,
    activityEvents,
  };

  return <SalesDashboard profile={profile} data={data} currency={reg?.default_currency ?? "OMR"} />;
}
