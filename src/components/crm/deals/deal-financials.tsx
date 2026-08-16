"use client";

import { useEffect, useState } from "react";
import { todayLocalDateString } from "@/components/crm/activities/activities-config";
import { money } from "./deals-config";
import { shortDate } from "@/components/crm/leads/board-config";
import type {
  CrmCommissionSplit,
  CrmDeal,
  CrmDealCommission,
  CrmPayment,
  CrmPaymentPlan,
  CrmPaymentSchedule,
  CrmTransaction,
  CrmUser,
} from "@/lib/types";
import {
  addCommissionSplit,
  addPayment,
  applyPaymentPlan,
  calcCommission,
  clearPendingSchedule,
  deleteSplit,
  getDealFinancials,
  markInstallmentPaid,
  refundPayment,
  setCommissionStatus,
  setSplitStatus,
  startTransaction,
  updateTransaction,
} from "@/app/(app)/crm/offers/finance-actions";

const TX_STATUSES: { key: string; label: string; color: string }[] = [
  { key: "draft", label: "Draft", color: "#c4c4c4" },
  { key: "contract_pending", label: "Contract Pending", color: "#fdab3d" },
  { key: "contract_signed", label: "Contract Signed", color: "#579bfc" },
  { key: "payment_in_progress", label: "Payment in Progress", color: "#00a0a0" },
  { key: "registration_pending", label: "Registration Pending", color: "#784bd1" },
  { key: "completed", label: "Completed", color: "#00c875" },
];

const PAYMENT_TYPES = ["down_payment", "installment", "reservation_fee", "handover", "other"];
const PAYMENT_METHODS = ["bank_transfer", "cheque", "cash", "card", "other"];

const COMMISSION_STATUSES: { key: string; label: string; color: string }[] = [
  { key: "expected", label: "Expected", color: "#fdab3d" },
  { key: "invoiced", label: "Invoiced", color: "#579bfc" },
  { key: "partially_received", label: "Partially Received", color: "#00a0a0" },
  { key: "received", label: "Received", color: "#00c875" },
  { key: "written_off", label: "Written Off", color: "#e2445c" },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="m-0 pb-[8px] pt-[20px] font-display text-[14px] font-semibold leading-[20px] text-ink">
      {children}
    </h4>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex h-[22px] items-center whitespace-nowrap rounded-[12px] px-[10px] font-sans text-[12px] leading-[16px] text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}

/**
 * Financial section of the deal drawer — rendered ONLY for admin/finance
 * (the tables are also RLS-gated, this is just the matching affordance).
 */
export function DealFinancials({
  deal,
  users = [],
  onToast,
}: {
  deal: CrmDeal;
  users?: CrmUser[];
  onToast: (message: string, tone?: "success" | "alert") => void;
}) {
  const [transaction, setTransaction] = useState<CrmTransaction | null>(null);
  const [payments, setPayments] = useState<CrmPayment[]>([]);
  const [schedule, setSchedule] = useState<CrmPaymentSchedule[]>([]);
  const [plans, setPlans] = useState<CrmPaymentPlan[]>([]);
  const [commission, setCommission] = useState<CrmDealCommission | null>(null);
  const [splits, setSplits] = useState<CrmCommissionSplit[]>([]);
  const [loading, setLoading] = useState(true);
  const [payAmount, setPayAmount] = useState("");
  const [payType, setPayType] = useState("down_payment");
  const [payMethod, setPayMethod] = useState("bank_transfer");
  const [commissionPct, setCommissionPct] = useState("3");
  const [planPick, setPlanPick] = useState("");
  const [splitUser, setSplitUser] = useState("");
  const [splitPct, setSplitPct] = useState("");

  const reload = async () => {
    const data = await getDealFinancials(deal.id);
    setTransaction(data.transaction);
    setPayments(data.payments);
    setSchedule(data.schedule);
    setPlans(data.plans);
    setCommission(data.commission);
    setSplits(data.splits);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal.id]);

  if (loading) {
    return <p className="pt-[20px] font-sans text-[13px] text-ink-muted">Loading financials…</p>;
  }

  const confirmedTotal = payments
    .filter((p) => p.status === "confirmed")
    .reduce((s, p) => s + Number(p.amount), 0);
  const balance = (Number(transaction?.agreed_price) || 0) - confirmedTotal;
  const txStatus = TX_STATUSES.find((s) => s.key === transaction?.status);

  return (
    <>
      {/* transaction */}
      <SectionTitle>Transaction</SectionTitle>
      {!transaction ? (
        <button
          type="button"
          onClick={async () => {
            const result = await startTransaction(deal.id);
            if (result.error) onToast(result.error, "alert");
            else onToast("Transaction started");
            reload();
          }}
          className="rounded-[4px] bg-teal-deep px-[12px] py-[6px] font-sans text-[13px] text-white transition-opacity hover:opacity-90"
        >
          Start transaction
        </button>
      ) : (
        <div className="rounded-[6px] border border-line px-[12px] py-[10px]">
          <div className="flex items-center justify-between gap-[8px]">
            <p className="m-0 font-sans text-[14px] font-medium leading-[20px] text-ink">
              {transaction.reference} · {money(transaction.agreed_price, transaction.currency)}
            </p>
            {txStatus && <Pill label={txStatus.label} color={txStatus.color} />}
          </div>
          <div className="mt-[8px] flex items-center gap-[6px]">
            <select
              value={transaction.status}
              onChange={async (e) => {
                const status = e.target.value;
                setTransaction({ ...transaction, status });
                const patch: Record<string, unknown> = { status };
                if (status === "completed") patch.completed_at = new Date().toISOString();
                const result = await updateTransaction(transaction.id, patch);
                if (result.error) onToast(result.error, "alert");
                else onToast("Transaction updated");
              }}
              className="h-[30px] flex-1 rounded-[4px] border border-line-strong px-[8px] font-sans text-[13px] text-ink outline-none focus:border-teal-deep"
            >
              {TX_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <p className="m-0 mt-[8px] font-sans text-[12px] leading-[16px] text-ink-muted">
            Paid {money(confirmedTotal, transaction.currency)} · Balance{" "}
            {money(balance, transaction.currency)}
          </p>
        </div>
      )}

      {/* payments */}
      {transaction && (
        <>
          <SectionTitle>Payments</SectionTitle>
          {payments.length === 0 && (
            <p className="m-0 font-sans text-[13px] text-ink-muted">No payments recorded.</p>
          )}
          {payments.map((p) => (
            <div
              key={p.id}
              className="mt-[6px] flex items-center justify-between rounded-[6px] border border-line px-[12px] py-[8px]"
            >
              <div>
                <p className="m-0 font-sans text-[14px] leading-[20px] text-ink">
                  {money(p.amount, p.currency)}
                  <span className="pl-[6px] font-sans text-[12px] text-ink-muted">
                    {(p.payment_type ?? "").replace("_", " ")} · {(p.method ?? "").replace("_", " ")}
                  </span>
                </p>
                <p className="m-0 font-sans text-[12px] leading-[16px] text-ink-muted">
                  {shortDate(p.payment_date)}
                </p>
              </div>
              <div className="flex items-center gap-[6px]">
                <Pill
                  label={p.status}
                  color={p.status === "confirmed" ? "#00c875" : p.status === "refunded" ? "#676879" : "#fdab3d"}
                />
                {p.status === "confirmed" && (
                  <button
                    type="button"
                    onClick={async () => {
                      const result = await refundPayment(p.id);
                      if (result.error) onToast(result.error, "alert");
                      else onToast("Payment marked refunded");
                      reload();
                    }}
                    className="rounded-[4px] px-[6px] py-[2px] font-sans text-[12px] text-ink-muted transition-colors hover:bg-[var(--hover-ghost)]"
                  >
                    Refund
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="mt-[8px] flex flex-wrap gap-[6px]">
            <input
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="Amount (OMR)"
              inputMode="decimal"
              className="h-[32px] w-[120px] rounded-[4px] border border-line-strong px-[8px] font-sans text-[13px] text-ink outline-none focus:border-teal-deep"
            />
            <select
              value={payType}
              onChange={(e) => setPayType(e.target.value)}
              className="h-[32px] rounded-[4px] border border-line-strong px-[6px] font-sans text-[13px] text-ink outline-none focus:border-teal-deep"
            >
              {PAYMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </select>
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
              className="h-[32px] rounded-[4px] border border-line-strong px-[6px] font-sans text-[13px] text-ink outline-none focus:border-teal-deep"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m.replace("_", " ")}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!payAmount || Number(payAmount) <= 0}
              onClick={async () => {
                const result = await addPayment(transaction.id, {
                  amount: Number(payAmount),
                  paymentType: payType,
                  method: payMethod,
                });
                if (result.error) onToast(result.error, "alert");
                else onToast("Payment recorded");
                setPayAmount("");
                reload();
              }}
              className="h-[32px] rounded-[4px] bg-teal-deep px-[12px] font-sans text-[13px] text-white transition-opacity disabled:opacity-40"
            >
              Record
            </button>
          </div>
        </>
      )}

      {/* payment schedule */}
      {transaction && (
        <>
          <SectionTitle>Payment schedule</SectionTitle>
          {schedule.length === 0 ? (
            <div className="flex gap-[6px]">
              <select
                value={planPick}
                onChange={(e) => setPlanPick(e.target.value)}
                className="h-[32px] min-w-0 flex-1 rounded-[4px] border border-line-strong px-[8px] font-sans text-[13px] text-ink outline-none focus:border-teal-deep"
              >
                <option value="">Pick a payment plan…</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({(p.installments ?? []).length} installments)
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!planPick}
                onClick={async () => {
                  const result = await applyPaymentPlan(transaction.id, planPick);
                  if (result.error) onToast(result.error, "alert");
                  else onToast(`Schedule generated — ${result.count} installments`);
                  setPlanPick("");
                  reload();
                }}
                className="h-[32px] shrink-0 rounded-[4px] bg-teal-deep px-[12px] font-sans text-[13px] text-white transition-opacity disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          ) : (
            <div className="rounded-[6px] border border-line">
              {schedule.map((s, i) => (
                <div
                  key={s.id}
                  className={`flex items-center justify-between px-[12px] py-[8px] ${
                    i === schedule.length - 1 ? "" : "border-b border-line"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="m-0 truncate font-sans text-[13px] leading-[19px] text-ink">
                      {s.installment_number}. {s.title}
                    </p>
                    <p className="m-0 font-sans text-[12px] leading-[16px] text-ink-muted">
                      {money(s.expected_amount, s.currency)}
                      {s.due_date ? ` · due ${shortDate(s.due_date)}` : " · no due date"}
                    </p>
                  </div>
                  {s.status === "paid" ? (
                    <Pill label="Paid" color="#00c875" />
                  ) : (
                    <div className="flex shrink-0 items-center gap-[6px]">
                      <Pill
                        label={
                          s.due_date && s.due_date < todayLocalDateString()
                            ? "Overdue"
                            : "Pending"
                        }
                        color={
                          s.due_date && s.due_date < todayLocalDateString()
                            ? "#e2445c"
                            : "#fdab3d"
                        }
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const result = await markInstallmentPaid(s.id, "bank_transfer");
                          if (result.error) onToast(result.error, "alert");
                          else onToast(`"${s.title}" marked paid`);
                          reload();
                        }}
                        className="rounded-[4px] px-[6px] py-[2px] font-sans text-[12px] text-brand transition-colors hover:bg-[var(--hover-ghost)]"
                      >
                        Mark paid
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-line px-[12px] py-[6px]">
                <p className="m-0 font-sans text-[12px] leading-[16px] text-ink-muted">
                  {schedule.filter((s) => s.status === "paid").length}/{schedule.length} paid ·{" "}
                  {money(
                    schedule.reduce((sum, s) => sum + Number(s.paid_amount ?? 0), 0),
                    transaction.currency
                  )}{" "}
                  collected
                </p>
                {schedule.some((s) => s.status === "pending") && (
                  <button
                    type="button"
                    onClick={async () => {
                      const result = await clearPendingSchedule(transaction.id);
                      if (result.error) onToast(result.error, "alert");
                      else onToast("Pending installments removed");
                      reload();
                    }}
                    className="rounded-[4px] px-[6px] py-[2px] font-sans text-[12px] text-ink-muted transition-colors hover:bg-[var(--hover-ghost)]"
                  >
                    Remove pending
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* commission */}
      <SectionTitle>Commission</SectionTitle>
      {commission ? (
        <div className="rounded-[6px] border border-line px-[12px] py-[10px]">
          <div className="flex items-center justify-between gap-[8px]">
            <p className="m-0 font-sans text-[14px] leading-[20px] text-ink">
              Gross {money(commission.gross_commission, commission.currency)} · Net{" "}
              {money(commission.net_commission, commission.currency)}
            </p>
            <Pill
              label={COMMISSION_STATUSES.find((s) => s.key === commission.status)?.label ?? commission.status}
              color={COMMISSION_STATUSES.find((s) => s.key === commission.status)?.color ?? "#676879"}
            />
          </div>
          <div className="mt-[8px] flex items-center gap-[6px]">
            <select
              value={commission.status}
              onChange={async (e) => {
                const status = e.target.value;
                setCommission({ ...commission, status });
                const result = await setCommissionStatus(
                  commission.id,
                  status,
                  status === "received" ? Number(commission.net_commission ?? 0) : undefined
                );
                if (result.error) onToast(result.error, "alert");
                else onToast("Commission updated");
              }}
              className="h-[30px] flex-1 rounded-[4px] border border-line-strong px-[8px] font-sans text-[13px] text-ink outline-none focus:border-teal-deep"
            >
              {COMMISSION_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="flex gap-[6px]">
          <input
            value={commissionPct}
            onChange={(e) => setCommissionPct(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="%"
            inputMode="decimal"
            className="h-[32px] w-[70px] rounded-[4px] border border-line-strong px-[8px] font-sans text-[13px] text-ink outline-none focus:border-teal-deep"
          />
          <button
            type="button"
            disabled={!commissionPct || Number(commissionPct) <= 0}
            onClick={async () => {
              const result = await calcCommission(deal.id, Number(commissionPct));
              if (result.error) onToast(result.error, "alert");
              else onToast(`Commission calculated: ${money(result.gross ?? 0)}`);
              reload();
            }}
            className="h-[32px] rounded-[4px] bg-teal-deep px-[12px] font-sans text-[13px] text-white transition-opacity disabled:opacity-40"
          >
            Calculate from {money(deal.deal_value, deal.currency)}
          </button>
        </div>
      )}

      {/* commission splits */}
      {commission && (
        <>
          <SectionTitle>
            Commission splits
            {splits.length > 0 && (
              <span className="pl-[6px] font-sans text-[12px] font-normal text-ink-muted">
                {splits.reduce((s, x) => s + Number(x.percentage ?? 0), 0)}% allocated
              </span>
            )}
          </SectionTitle>
          {splits.length === 0 && (
            <p className="m-0 font-sans text-[13px] text-ink-muted">No splits yet.</p>
          )}
          {splits.map((s) => {
            const who = users.find((u) => u.id === s.recipient_user_id);
            return (
              <div
                key={s.id}
                className="mt-[6px] flex items-center justify-between rounded-[6px] border border-line px-[12px] py-[8px]"
              >
                <div className="min-w-0">
                  <p className="m-0 truncate font-sans text-[14px] leading-[20px] text-ink">
                    {who?.full_name ?? "Member"}
                    <span className="pl-[6px] font-sans text-[12px] text-ink-muted">
                      {Number(s.percentage ?? 0)}%
                    </span>
                  </p>
                  <p className="m-0 font-sans text-[12px] leading-[16px] text-ink-muted">
                    {money(s.calculated_amount ?? 0, commission.currency)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-[6px]">
                  <select
                    value={s.status}
                    onChange={async (e) => {
                      const status = e.target.value as "pending" | "approved" | "paid";
                      setSplits((prev) => prev.map((x) => (x.id === s.id ? { ...x, status } : x)));
                      const result = await setSplitStatus(s.id, status);
                      if (result.error) onToast(result.error, "alert");
                    }}
                    className="h-[28px] rounded-[4px] border border-line-strong px-[6px] font-sans text-[12px] text-ink outline-none focus:border-teal-deep"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Paid</option>
                  </select>
                  <button
                    type="button"
                    onClick={async () => {
                      const result = await deleteSplit(s.id);
                      if (result.error) onToast(result.error, "alert");
                      else onToast("Split removed");
                      reload();
                    }}
                    className="rounded-[4px] px-[6px] py-[2px] font-sans text-[12px] text-ink-muted transition-colors hover:bg-[var(--hover-ghost)]"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
          <div className="mt-[8px] flex gap-[6px]">
            <select
              value={splitUser}
              onChange={(e) => setSplitUser(e.target.value)}
              className="h-[32px] min-w-0 flex-1 rounded-[4px] border border-line-strong px-[8px] font-sans text-[13px] text-ink outline-none focus:border-teal-deep"
            >
              <option value="">Team member…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.email}
                </option>
              ))}
            </select>
            <input
              value={splitPct}
              onChange={(e) => setSplitPct(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="%"
              inputMode="decimal"
              className="h-[32px] w-[64px] rounded-[4px] border border-line-strong px-[8px] font-sans text-[13px] text-ink outline-none focus:border-teal-deep"
            />
            <button
              type="button"
              disabled={!splitUser || !splitPct || Number(splitPct) <= 0}
              onClick={async () => {
                const result = await addCommissionSplit(commission.id, splitUser, Number(splitPct));
                if (result.error) onToast(result.error, "alert");
                else onToast("Split added");
                setSplitUser("");
                setSplitPct("");
                reload();
              }}
              className="h-[32px] shrink-0 rounded-[4px] bg-teal-deep px-[12px] font-sans text-[13px] text-white transition-opacity disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </>
      )}
    </>
  );
}
