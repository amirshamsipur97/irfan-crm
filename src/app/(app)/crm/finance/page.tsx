import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { canViewFinance } from "@/lib/permissions";
import { Surface } from "@/components/shell/AppChrome";
import { money } from "@/components/crm/deals/deals-config";
import type { CrmDeal, CrmDealCommission, CrmPayment, CrmTransaction } from "@/lib/types";

const TX_STATUS_META: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "#c4c4c4" },
  contract_pending: { label: "Contract Pending", color: "#fdab3d" },
  contract_signed: { label: "Contract Signed", color: "#579bfc" },
  payment_in_progress: { label: "Payment in Progress", color: "#00a0a0" },
  registration_pending: { label: "Registration Pending", color: "#784bd1" },
  completed: { label: "Completed", color: "#00c875" },
  cancelled: { label: "Cancelled", color: "#e2445c" },
};

/** Finance overview — transactions with paid-to-date and commission health. */
export default async function FinancePage() {
  const profile = await getProfile();
  const allowed = canViewFinance(profile.role);

  if (!allowed) {
    return (
      <Surface>
        <div className="flex h-full items-center justify-center">
          <p className="font-sans text-[14px] text-ink-muted">
            Finance is only visible to admin and finance roles.
          </p>
        </div>
      </Surface>
    );
  }

  const supabase = await createClient();
  const [{ data: transactions }, { data: payments }, { data: commissions }, { data: deals }] =
    await Promise.all([
      supabase
        .from("crm_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .returns<CrmTransaction[]>(),
      supabase.from("crm_payments").select("*").eq("status", "confirmed").returns<CrmPayment[]>(),
      supabase.from("crm_deal_commissions").select("*").returns<CrmDealCommission[]>(),
      supabase.from("crm_deals").select("id, name").returns<Pick<CrmDeal, "id" | "name">[]>(),
    ]);

  const txs = transactions ?? [];
  const paidByTx = new Map<string, number>();
  for (const p of payments ?? []) {
    if (p.transaction_id)
      paidByTx.set(p.transaction_id, (paidByTx.get(p.transaction_id) ?? 0) + Number(p.amount));
  }
  const commissionByDeal = new Map((commissions ?? []).map((c) => [c.deal_id, c]));
  const dealName = new Map((deals ?? []).map((d) => [d.id, d.name]));

  const totalPipeline = txs
    .filter((t) => t.status !== "cancelled" && t.status !== "completed")
    .reduce((s, t) => s + (Number(t.agreed_price) || 0), 0);
  const totalCollected = [...paidByTx.values()].reduce((s, v) => s + v, 0);
  const commissionExpected = (commissions ?? [])
    .filter((c) => c.status !== "received" && c.status !== "written_off")
    .reduce((s, c) => s + (Number(c.net_commission) || 0), 0);
  const commissionReceived = (commissions ?? []).reduce(
    (s, c) => s + (Number(c.received_amount) || 0),
    0
  );

  const kpis = [
    { label: "Open transactions value", value: money(totalPipeline) },
    { label: "Collected payments", value: money(totalCollected) },
    { label: "Commission expected", value: money(commissionExpected) },
    { label: "Commission received", value: money(commissionReceived) },
  ];

  return (
    <Surface>
      <div className="thin-scroll h-full overflow-auto px-[32px] pb-[48px] pt-[24px]">
        <h1 className="m-0 font-display text-[24px] font-medium leading-[30px] tracking-[-0.1px] text-ink">
          Finance
        </h1>
        <p className="mb-[20px] mt-[2px] font-sans text-[13px] text-ink-muted">
          Transactions, collections and commissions — visible to admin &amp; finance only.
        </p>

        <div className="grid grid-cols-2 gap-[12px] lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-[8px] border border-line bg-white px-[16px] py-[14px]">
              <p className="m-0 font-sans text-[12px] leading-[16px] text-ink-muted">{k.label}</p>
              <p className="m-0 pt-[4px] font-display text-[20px] font-semibold leading-[26px] text-ink">
                {k.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-[24px] overflow-x-auto rounded-[8px] border border-line bg-white">
          <table className="w-full min-w-[760px] border-collapse font-sans text-[13.5px]">
            <thead>
              <tr>
                {["Reference", "Deal", "Agreed price", "Paid", "Balance", "Status", "Commission (net)"].map(
                  (h) => (
                    <th
                      key={h}
                      className="border-b border-line bg-canvas px-[14px] py-[10px] text-left text-[12px] font-bold text-ink-muted"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {txs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-[14px] py-[24px] text-center text-ink-muted">
                    No transactions yet — start one from a deal&apos;s panel.
                  </td>
                </tr>
              )}
              {txs.map((t) => {
                const paid = paidByTx.get(t.id) ?? 0;
                const balance = (Number(t.agreed_price) || 0) - paid;
                const meta = TX_STATUS_META[t.status] ?? { label: t.status, color: "#676879" };
                const commission = t.deal_id ? commissionByDeal.get(t.deal_id) : undefined;
                return (
                  <tr key={t.id} className="border-b border-line-soft last:border-b-0">
                    <td className="px-[14px] py-[9px] font-medium text-ink">{t.reference}</td>
                    <td className="px-[14px] py-[9px] text-ink">
                      {t.deal_id ? dealName.get(t.deal_id) ?? "—" : "—"}
                    </td>
                    <td className="px-[14px] py-[9px] text-ink">{money(t.agreed_price, t.currency)}</td>
                    <td className="px-[14px] py-[9px] text-ink">{money(paid, t.currency)}</td>
                    <td className="px-[14px] py-[9px] text-ink">{money(balance, t.currency)}</td>
                    <td className="px-[14px] py-[9px]">
                      <span
                        className="inline-flex h-[22px] items-center whitespace-nowrap rounded-[12px] px-[10px] text-[12px] text-white"
                        style={{ backgroundColor: meta.color }}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-[14px] py-[9px] text-ink">
                      {commission ? `${money(commission.net_commission, commission.currency)} · ${commission.status}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Surface>
  );
}
