"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const PAGE = "/crm/finance";

/** Payment-plan template CRUD — finance tier via RLS. */
export async function createPaymentPlan(name: string) {
  const clean = name.trim();
  if (!clean) return { error: "plan name required" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { data, error } = await supabase
    .from("crm_payment_plans")
    .insert({ name: clean, created_by: user.id })
    .select("id")
    .single<{ id: string }>();
  if (error) return { error: error.message };
  revalidatePath(PAGE);
  return { id: data.id };
}

export async function updatePaymentPlan(
  planId: string,
  patch: { name?: string; description?: string | null; active?: boolean }
) {
  const supabase = await createClient();
  const { error } = await supabase.from("crm_payment_plans").update(patch).eq("id", planId);
  if (error) return { error: error.message };
  revalidatePath(PAGE);
  return {};
}

export async function deletePaymentPlan(planId: string) {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_payment_plans")
    .delete({ count: "exact" })
    .eq("id", planId);
  if (error) return { error: error.message };
  if (!count) return { error: "Only Developer/CEO can delete plans" };
  revalidatePath(PAGE);
  return {};
}

const DUE_RULE = /^(booking|handover|days:\d{1,4})$/;

export async function addPlanInstallment(
  planId: string,
  input: { label: string; percentage: number; dueRule: string; sequence: number }
) {
  if (!input.label.trim()) return { error: "label required" };
  if (!Number.isFinite(input.percentage) || input.percentage <= 0 || input.percentage > 100)
    return { error: "percentage must be 1–100" };
  if (!DUE_RULE.test(input.dueRule)) return { error: "invalid due rule" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_payment_plan_installments")
    .insert({
      plan_id: planId,
      label: input.label.trim(),
      percentage: input.percentage,
      due_rule: input.dueRule,
      sequence: input.sequence,
    })
    .select("id")
    .single<{ id: string }>();
  if (error) return { error: error.message };
  revalidatePath(PAGE);
  return { id: data.id };
}

export async function deletePlanInstallment(installmentId: string) {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_payment_plan_installments")
    .delete({ count: "exact" })
    .eq("id", installmentId);
  if (error) return { error: error.message };
  if (!count) return { error: "Only Developer/CEO can delete installments" };
  revalidatePath(PAGE);
  return {};
}
