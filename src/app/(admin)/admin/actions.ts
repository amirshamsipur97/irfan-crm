"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const PAGE = "/admin";

/** Signup rules — allowed email domains + agent seat cap (RLS: admin tier only). */
export async function updateRegistrationSettings(allowedDomains: string[], maxAgents: number) {
  const domains = allowedDomains
    .map((d) => d.trim().toLowerCase())
    .filter((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d));
  if (!Number.isFinite(maxAgents) || maxAgents < 1 || maxAgents > 500)
    return { error: "max agents must be between 1 and 500" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_registration_settings")
    .update({ allowed_domains: domains, max_agents: Math.round(maxAgents), updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) return { error: error.message };
  revalidatePath(PAGE);
  return { domains };
}

/** Sales Dashboard targets (annual_target / monthly_target / forecast_goal). */
export async function setDashboardTargets(targets: Record<string, number>) {
  const ALLOWED = ["annual_target", "monthly_target", "forecast_goal"];
  const rows = Object.entries(targets)
    .filter(([k, v]) => ALLOWED.includes(k) && Number.isFinite(v) && v >= 0)
    .map(([key, value]) => ({ key, value }));
  if (rows.length === 0) return { error: "nothing to save" };

  const supabase = await createClient();
  const { error } = await supabase.from("crm_dashboard_settings").upsert(rows);
  if (error) return { error: error.message };
  revalidatePath(PAGE);
  revalidatePath("/crm/dashboard");
  return {};
}
