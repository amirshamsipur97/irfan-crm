"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CrmDealCommission, CrmPayment, CrmTransaction } from "@/lib/types";

const BOARD_PATH = "/crm/deals";

/** Transaction + payments + commission for one deal (finance/admin only via RLS). */
export async function getDealFinancials(dealId: string) {
  const supabase = await createClient();
  const [{ data: transactions }, { data: commission }] = await Promise.all([
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
  ]);

  const tx = transactions?.[0] ?? null;
  const { data: payments } = tx
    ? await supabase
        .from("crm_payments")
        .select("*")
        .eq("transaction_id", tx.id)
        .order("payment_date", { ascending: false })
        .returns<CrmPayment[]>()
    : { data: [] as CrmPayment[] };

  return { transaction: tx, payments: payments ?? [], commission: commission ?? null };
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
