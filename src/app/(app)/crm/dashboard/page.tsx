import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { canManageBoards } from "@/lib/permissions";
import { recordBoardVisit } from "@/lib/visits";
import {
  SalesDashboard,
  type DashboardData,
} from "@/components/crm/dashboard/SalesDashboard";
import type { CrmActivityItem, CrmDeal, CrmDealStage, CrmLead, CrmUser, CrmViewing } from "@/lib/types";

const MONTH_LABEL = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "long", year: "numeric" });

export default async function SalesDashboardPage() {
  const [profile, supabase] = await Promise.all([getProfile(), createClient(), recordBoardVisit("dashboard")]);

  const [{ data: deals }, { data: stages }, { data: activities }, { data: users }, { data: settings }, { data: leads }, { data: viewings }, { data: reg }, { data: parts }] =
    await Promise.all([
      supabase.from("crm_deals").select("*").returns<CrmDeal[]>(),
      supabase.from("crm_deal_stages").select("*").order("position").returns<CrmDealStage[]>(),
      supabase.from("crm_activity_items").select("*").returns<CrmActivityItem[]>(),
      // EVERY member, not just active ones: a lead owned by someone who left
      // must still show their name, not fall into "Unassigned"
      supabase.from("crm_users").select("*").returns<CrmUser[]>(),
      supabase.from("crm_dashboard_settings").select("*").returns<{ key: string; value: number }[]>(),
      supabase.from("crm_leads").select("*").eq("is_archived", false).returns<CrmLead[]>(),
      supabase.from("crm_viewings").select("*").returns<CrmViewing[]>(),
      supabase
        .from("crm_registration_settings")
        .select("default_currency")
        .maybeSingle<{ default_currency: string }>(),
      supabase
        .from("crm_deal_downpayments")
        .select("deal_id, amount, paid_at")
        .returns<{ deal_id: string; amount: number; paid_at: string }[]>(),
    ]);

  const allDeals = deals ?? [];
  const allStages = stages ?? [];
  const setting = (key: string, fallback: number) =>
    Number((settings ?? []).find((s) => s.key === key)?.value ?? fallback);

  const lostStageIds = new Set(allStages.filter((s) => s.is_lost).map((s) => s.id));
  const stageById = new Map(allStages.map((s) => [s.id, s]));

  /**
   * A sale is WON when the client accepts the offer (Move to deal stamps
   * accepted_at) — NOT when someone drags the row into a "Won" stage. The
   * team never uses those legacy stages, so every money widget that keyed
   * off is_won reported 0 forever. Everything below reads the real model:
   * offers → accepted deals → downpayment cash actually collected.
   */
  const wonDeals = allDeals.filter((d) => d.accepted_at);
  const activeDeals = allDeals.filter((d) => !d.accepted_at && !lostStageIds.has(d.stage_id));

  const value = (d: CrmDeal) => Number(d.deal_value) || 0;
  const wonDate = (d: CrmDeal) => new Date(d.accepted_at as string);

  const now = new Date();
  const yearWon = wonDeals.filter((d) => wonDate(d).getFullYear() === now.getFullYear());
  const monthWon = yearWon.filter((d) => wonDate(d).getMonth() === now.getMonth());

  // average price of an accepted deal; before the first acceptance, fall back
  // to the average offer on the table so the tile is never a blank 0
  const avgBase = wonDeals.length > 0 ? wonDeals : allDeals;
  const valued = avgBase.filter((d) => d.deal_value != null);
  const avgDealValue =
    valued.length > 0 ? valued.reduce((s, d) => s + value(d), 0) / valued.length : 0;
  const avgIsAccepted = wonDeals.length > 0;

  // what is still on the table — full offer price, since nobody maintains a
  // close probability (the old weighted forecast was always 0)
  const activeForecast = activeDeals.reduce((s, d) => s + value(d), 0);

  // real cash in the bank: downpayment parts recorded against deals
  const allParts = parts ?? [];
  const collected = allParts.reduce((s, p) => s + Number(p.amount), 0);
  const collectedThisYear = allParts
    .filter((p) => new Date(p.paid_at).getFullYear() === now.getFullYear())
    .reduce((s, p) => s + Number(p.amount), 0);

  // pie — deals per current stage
  const statusDistribution = allStages
    .map((s) => ({
      label: s.name,
      color: s.color,
      count: allDeals.filter((d) => d.stage_id === s.id).length,
    }))
    .filter((s) => s.count > 0);

  // actual revenue by month — accepted deals, by the date they were accepted
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

  // the real funnel of this business: every lead → the ones that became a
  // client → the offers written → the offers accepted → downpayment complete
  const allLeads = leads ?? [];
  // counted by PERSON at every step, never by row: one client can hold several
  // offers, so counting offers here made the funnel widen to "200%"
  const clientsAt = (filter: (d: CrmDeal) => boolean) =>
    new Set(
      allDeals
        .filter(filter)
        .map((d) => d.contact_id ?? d.contact_name?.trim().toLowerCase() ?? d.id)
    ).size;
  const funnel = [
    { label: "Leads", count: allLeads.length, color: "#579bfc" },
    { label: "Contacts", count: allLeads.filter((l) => l.converted_contact_id).length, color: "#579bfc" },
    {
      label: "Got an offer",
      count: clientsAt((d) => !lostStageIds.has(d.stage_id)),
      color: "#579bfc",
    },
    { label: "Accepted", count: clientsAt((d) => !!d.accepted_at), color: "#00c875" },
    {
      label: "Downpayment done",
      count: clientsAt((d) => !!d.downpayment_completed_at),
      color: "#00c875",
    },
  ];
  const total = funnel[0]?.count ?? 0;
  const conversionToWon = total > 0 ? Math.round((wonDeals.length / total) * 100) : 0;

  // open offers by their expected close month, at full price (no probability
  // weighting — that field is never filled in, so it only produced zeros)
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
    entry.value += value(d);
    forecastMap.set(key, entry);
  }
  const forecastByMonth = [...forecastMap.values()].sort((a, b) => a.ts - b.ts);

  const forecastByStage = allStages
    .filter((s) => !s.is_won && !s.is_lost)
    .map((s) => ({
      label: s.name,
      color: s.color,
      value: activeDeals.filter((d) => d.stage_id === s.id).reduce((sum, d) => sum + value(d), 0),
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
    avgIsAccepted,
    activeForecast,
    collected,
    collectedThisYear,
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
