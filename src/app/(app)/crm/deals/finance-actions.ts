"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  CrmCommissionSplit,
  CrmDealCommission,
  CrmPayment,
  CrmPaymentPlan,
  CrmPaymentPlanInstallment,
  CrmPaymentSchedule,
  CrmTransaction,
} from "@/lib/types";

const BOARD_PATH = "/crm/deals";

/** Transaction + payments + schedule + commission (+splits) for one deal. */
export async function getDealFinancials(dealId: string) {
  const supabase = await createClient();
  const [{ data: transactions }, { data: commission }, { data: plans }] = await Promise.all([
    supabase
      .from("crm_transactions")
      .select("*")
      .eq("deal_id", dealId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .returns<CrmTransaction[]>(),
    supabase
      .from("crm_deal_commissions")
      .select("*")
      .eq("deal_id", dealId)
      .maybeSingle<CrmDealCommission>(),
    supabase
      .from("crm_payment_plans")
      .select("*, installments:crm_payment_plan_installments(*)")
      .eq("active", true)
      .order("name")
      .returns<CrmPaymentPlan[]>(),
  ]);

  const tx = transactions?.[0] ?? null;
  const [{ data: payments }, { data: schedule }, { data: splits }] = await Promise.all([
    tx
      ? supabase
          .from("crm_payments")
          .select("*")
          .eq("transaction_id", tx.id)
          .order("payment_date", { ascending: false })
          .returns<CrmPayment[]>()
      : Promise.resolve({ data: [] as CrmPayment[] }),
    tx
      ? supabase
          .from("crm_payment_schedules")
          .select("*")
          .eq("transaction_id", tx.id)
          .order("installment_number")
          .returns<CrmPaymentSchedule[]>()
      : Promise.resolve({ data: [] as CrmPaymentSchedule[] }),
    commission
      ? supabase
          .from("crm_commission_splits")
          .select("*")
          .eq("deal_commission_id", commission.id)
          .order("created_at")
          .returns<CrmCommissionSplit[]>()
      : Promise.resolve({ data: [] as CrmCommissionSplit[] }),
  ]);

  return {
    transaction: tx,
    payments: payments ?? [],
    schedule: schedule ?? [],
    commission: commission ?? null,
    splits: splits ?? [],
    plans: plans ?? [],
  };
}

/** due_rule → concrete due date ("booking" | "days:<n>" | "handover"). */
function dueDateFor(rule: string, tx: CrmTransaction): string | null {
  const base = tx.contract_date ?? new Date().toISOString().slice(0, 10);
  if (rule === "booking") return base;
  if (rule === "handover") return tx.expected_completion_date ?? null;
  const m = /^days:(\d+)$/.exec(rule);
  if (m) {
    const d = new Date(`${base}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + Number(m[1]));
    return d.toISOString().slice(0, 10);
  }
  return null;
}

/** Generate the payment schedule for a transaction from a plan template. */
export async function applyPaymentPlan(transactionId: string, planId: string) {
  const supabase = await createClient();

  const [{ data: tx }, { data: installments }, { count: existing }] = await Promise.all([
    supabase
      .from("crm_transactions")
      .select("*")
      .eq("id", transactionId)
      .maybeSingle<CrmTransaction>(),
    supabase
      .from("crm_payment_plan_installments")
      .select("*")
      .eq("plan_id", planId)
      .order("sequence")
      .returns<CrmPaymentPlanInstallment[]>(),
    supabase
      .from("crm_payment_schedules")
      .select("id", { count: "exact", head: true })
      .eq("transaction_id", transactionId),
  ]);

  if (!tx) return { error: "transaction not found" };
  if (!installments?.length) return { error: "plan has no installments" };
  if (existing) return { error: "a schedule already exists for this transaction" };
  const price = Number(tx.agreed_price) || 0;
  if (price <= 0) return { error: "transaction has no agreed price" };

  const rows = installments.map((i, idx) => ({
    transaction_id: transactionId,
    installment_number: idx + 1,
    title: i.label,
    expected_amount: Math.round(price * Number(i.percentage)) / 100,
    currency: tx.currency,
    due_date: dueDateFor(i.due_rule, tx),
    status: "pending",
  }));

  const { error } = await supabase.from("crm_payment_schedules").insert(rows);
  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return { count: rows.length };
}

/** Record the remaining amount of an installment as a confirmed payment. */
export async function markInstallmentPaid(scheduleId: string, method: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { data: row } = await supabase
    .from("crm_payment_schedules")
    .select("*")
    .eq("id", scheduleId)
    .maybeSingle<CrmPaymentSchedule>();
  if (!row) return { error: "installment not found" };
  if (row.status === "paid") return { error: "already paid" };

  const remaining = Number(row.expected_amount) - Number(row.paid_amount ?? 0);
  if (remaining <= 0) return { error: "nothing left to pay" };

  const { data: payment, error: payError } = await supabase
    .from("crm_payments")
    .insert({
      transaction_id: row.transaction_id,
      amount: remaining,
      payment_type: "installment",
      method,
      reference: row.title,
      status: "confirmed",
      created_by: user.id,
    })
    .select("id")
    .single<{ id: string }>();
  if (payError) return { error: payError.message };

  const { error } = await supabase
    .from("crm_payment_schedules")
    .update({
      status: "paid",
      paid_amount: Number(row.expected_amount),
      paid_at: new Date().toISOString(),
      payment_id: payment.id,
    })
    .eq("id", scheduleId);
  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return {};
}

/** Drop the not-yet-paid rows of a schedule (Developer/CEO only via RLS). */
export async function clearPendingSchedule(transactionId: string) {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_payment_schedules")
    .delete({ count: "exact" })
    .eq("transaction_id", transactionId)
    .eq("status", "pending");
  if (error) return { error: error.message };
  if (!count) return { error: "nothing removed (paid rows are kept; delete needs Developer/CEO)" };
  revalidatePath(BOARD_PATH);
  return {};
}

/** Add a percentage split of the net commission for a team member. */
export async function addCommissionSplit(
  commissionId: string,
  recipientUserId: string,
  percentage: number
) {
  if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100)
    return { error: "percentage must be 1–100" };
  const supabase = await createClient();

  const [{ data: commission }, { data: existing }] = await Promise.all([
    supabase
      .from("crm_deal_commissions")
      .select("net_commission")
      .eq("id", commissionId)
      .maybeSingle<{ net_commission: number | null }>(),
    supabase
      .from("crm_commission_splits")
      .select("percentage")
      .eq("deal_commission_id", commissionId)
      .returns<{ percentage: number | null }[]>(),
  ]);
  if (!commission) return { error: "commission not found" };

  const used = (existing ?? []).reduce((s, x) => s + Number(x.percentage ?? 0), 0);
  if (used + percentage > 100)
    return { error: `splits would exceed 100% (already allocated ${used}%)` };

  const net = Number(commission.net_commission ?? 0);
  const { error } = await supabase.from("crm_commission_splits").insert({
    deal_commission_id: commissionId,
    recipient_user_id: recipientUserId,
    split_type: "percentage",
    percentage,
    calculated_amount: Math.round(net * percentage) / 100,
    status: "pending",
  });
  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return {};
}

export async function setSplitStatus(splitId: string, status: "pending" | "approved" | "paid") {
  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_commission_splits")
    .update({ status })
    .eq("id", splitId);
  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return {};
}

export async function deleteSplit(splitId: string) {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_commission_splits")
    .delete({ count: "exact" })
    .eq("id", splitId);
  if (error) return { error: error.message };
  if (!count) return { error: "Only Developer/CEO can remove splits" };
  revalidatePath(BOARD_PATH);
  return {};
}

export async function startTransaction(dealId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crm_start_transaction", { p_deal_id: dealId });
  if (error) return { error: error.message };
  const result = (data ?? {}) as { error?: string; transaction_id?: string };
  if (result.error) return { error: result.error };
  revalidatePath(BOARD_PATH);
  return { transactionId: result.transaction_id };
}

const TX_PATCHABLE = new Set([
  "status",
  "agreed_price",
  "transaction_type",
  "contract_date",
  "expected_completion_date",
  "completed_at",
  "cancellation_reason",
]);

export async function updateTransaction(transactionId: string, patch: Record<string, unknown>) {
  const entries = Object.entries(patch).filter(([k]) => TX_PATCHABLE.has(k));
  if (entries.length === 0) return { error: "nothing to update" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_transactions")
    .update(Object.fromEntries(entries))
    .eq("id", transactionId);
  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return {};
}

export async function addPayment(
  transactionId: string,
  input: { amount: number; paymentType: string; method: string; reference?: string }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { error } = await supabase.from("crm_payments").insert({
    transaction_id: transactionId,
    amount: input.amount,
    payment_type: input.paymentType,
    method: input.method,
    reference: input.reference || null,
    status: "confirmed",
    created_by: user.id,
  });
  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return {};
}

export async function refundPayment(paymentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_payments")
    .update({ status: "refunded" })
    .eq("id", paymentId);
  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return {};
}

export async function calcCommission(dealId: string, percentage: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crm_calc_deal_commission", {
    p_deal_id: dealId,
    p_percentage: percentage,
  });
  if (error) return { error: error.message };
  const result = (data ?? {}) as { error?: string; gross?: number };
  if (result.error) return { error: result.error };
  revalidatePath(BOARD_PATH);
  return { gross: result.gross };
}

export async function setCommissionStatus(commissionId: string, status: string, receivedAmount?: number) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = { status };
  if (receivedAmount != null) {
    patch.received_amount = receivedAmount;
    patch.received_at = new Date().toISOString();
  }
  const { error } = await supabase.from("crm_deal_commissions").update(patch).eq("id", commissionId);
  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return {};
}
