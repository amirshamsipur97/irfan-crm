"use server";

import { revalidatePath } from "next/cache";
import { PERMISSION_ERROR } from "@/lib/mutate";
import { createClient } from "@/lib/supabase/server";
import type { CrmDealDownpayment } from "@/lib/types";

const PAGE = "/crm/deals";

/**
 * Record the next part payment toward a deal's downpayment. Parts are
 * numbered in order (Part 1, Part 2, ...) until the downpayment is complete —
 * the numbering continues from the highest part the deal already has.
 */
export async function addDownpaymentPart(
  dealId: string,
  amount: number,
  paidAt?: string,
  note?: string
) {
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter an amount above zero." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const [{ data: last }, { data: deal }] = await Promise.all([
    supabase
      .from("crm_deal_downpayments")
      .select("part_no")
      .eq("deal_id", dealId)
      .order("part_no", { ascending: false })
      .limit(1)
      .maybeSingle<{ part_no: number }>(),
    supabase.from("crm_deals").select("currency").eq("id", dealId).single<{ currency: string }>(),
  ]);

  const { data, error } = await supabase
    .from("crm_deal_downpayments")
    .insert({
      deal_id: dealId,
      part_no: (last?.part_no ?? 0) + 1,
      amount,
      currency: deal?.currency ?? "OMR",
      ...(paidAt ? { paid_at: paidAt } : {}),
      note: note?.trim() || null,
      created_by: user.id,
    })
    .select("*")
    .single<CrmDealDownpayment>();
  if (error) return { error: error.message };

  revalidatePath(PAGE);
  return { row: data };
}

export async function deleteDownpaymentPart(partId: string) {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_deal_downpayments")
    .delete({ count: "exact" })
    .eq("id", partId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  revalidatePath(PAGE);
  return {};
}
