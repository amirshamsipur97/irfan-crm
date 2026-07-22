"use client";

import { useState } from "react";
import type { CrmPaymentPlan } from "@/lib/types";
import { SuccessToast } from "@/components/ui/SuccessToast";
import {
  addPlanInstallment,
  createPaymentPlan,
  deletePaymentPlan,
  deletePlanInstallment,
  updatePaymentPlan,
} from "@/app/(app)/crm/finance/actions";

const DUE_OPTIONS = [
  { key: "booking", label: "On contract" },
  { key: "days:30", label: "+30 days" },
  { key: "days:60", label: "+60 days" },
  { key: "days:90", label: "+90 days" },
  { key: "days:180", label: "+180 days" },
  { key: "days:365", label: "+1 year" },
  { key: "handover", label: "On handover" },
];

const dueLabel = (rule: string) =>
  DUE_OPTIONS.find((o) => o.key === rule)?.label ??
  (rule.startsWith("days:") ? `+${rule.slice(5)} days` : rule);

const inputCls =
  "h-[32px] rounded-[4px] border border-line-strong px-[8px] font-sans text-[13px] text-ink outline-none focus:border-teal-deep";

/** Payment-plan templates manager (finance tier; delete needs Developer/CEO). */
export function PaymentPlans({ plans, isAdmin }: { plans: CrmPaymentPlan[]; isAdmin: boolean }) {
  const [localPlans, setLocalPlans] = useState(plans);
  const [newName, setNewName] = useState("");
  const [drafts, setDrafts] = useState<
    Record<string, { label: string; pct: string; due: string }>
  >({});
  const [toast, setToast] = useState<{ message: string; tone?: "success" | "alert" } | null>(null);

  const draft = (planId: string) => drafts[planId] ?? { label: "", pct: "", due: "booking" };
  const setDraft = (planId: string, patch: Partial<{ label: string; pct: string; due: string }>) =>
    setDrafts((prev) => ({ ...prev, [planId]: { ...draft(planId), ...patch } }));

  return (
    <div className="mt-[28px]">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="m-0 font-display text-[18px] font-medium leading-[24px] text-ink">
            Payment plans
          </h2>
          <p className="m-0 pt-[2px] font-sans text-[13px] text-ink-muted">
            Templates you can apply to any transaction from the deal panel.
          </p>
        </div>
        <div className="flex gap-[6px]">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. 20/80 Handover"
            className={`${inputCls} w-[200px]`}
          />
          <button
            type="button"
            disabled={!newName.trim()}
            onClick={async () => {
              const result = await createPaymentPlan(newName);
              if (result.error || !result.id) {
                setToast({ message: result.error ?? "failed", tone: "alert" });
                return;
              }
              setLocalPlans((prev) => [
                ...prev,
                {
                  id: result.id!,
                  development_id: null,
                  name: newName.trim(),
                  description: null,
                  currency: "OMR",
                  active: true,
                  created_by: null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  installments: [],
                },
              ]);
              setNewName("");
              setToast({ message: "Plan created — add its installments" });
            }}
            className="h-[32px] rounded-[4px] bg-teal-deep px-[12px] font-sans text-[13px] text-white transition-opacity disabled:opacity-40"
          >
            New plan
          </button>
        </div>
      </div>

      {localPlans.length === 0 && (
        <p className="mt-[12px] font-sans text-[13px] text-ink-muted">
          No plans yet — create one, e.g. “10% booking / 40% in 90 days / 50% handover”.
        </p>
      )}

      <div className="mt-[12px] grid grid-cols-1 gap-[12px] lg:grid-cols-2">
        {localPlans.map((plan) => {
          const totalPct = (plan.installments ?? []).reduce((s, i) => s + Number(i.percentage), 0);
          const d = draft(plan.id);
          return (
            <div key={plan.id} className="rounded-[8px] border border-line bg-white p-[16px]">
              <div className="flex items-center justify-between gap-[8px]">
                <p className="m-0 min-w-0 truncate font-sans text-[15px] font-semibold leading-[22px] text-ink">
                  {plan.name}
                </p>
                <div className="flex shrink-0 items-center gap-[6px]">
                  <span
                    className={`rounded-[12px] px-[8px] py-[2px] font-sans text-[12px] ${
                      totalPct === 100
                        ? "bg-[#00c875]/15 text-[#037f4c]"
                        : "bg-[#fdab3d]/20 text-[#a06000]"
                    }`}
                  >
                    {totalPct}%
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      const active = !plan.active;
                      setLocalPlans((prev) =>
                        prev.map((p) => (p.id === plan.id ? { ...p, active } : p))
                      );
                      await updatePaymentPlan(plan.id, { active });
                    }}
                    className={`rounded-[12px] px-[8px] py-[2px] font-sans text-[12px] transition-colors ${
                      plan.active
                        ? "bg-[#00a0a0]/15 text-[#007070] hover:bg-[#00a0a0]/25"
                        : "bg-[#eceef2] text-ink-muted hover:bg-[#e0e2ea]"
                    }`}
                  >
                    {plan.active ? "Active" : "Inactive"}
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      aria-label={`Delete plan ${plan.name}`}
                      onClick={async () => {
                        const result = await deletePaymentPlan(plan.id);
                        if (result.error) setToast({ message: result.error, tone: "alert" });
                        else {
                          setLocalPlans((prev) => prev.filter((p) => p.id !== plan.id));
                          setToast({ message: "Plan deleted" });
                        }
                      }}
                      className="rounded-[4px] px-[6px] py-[2px] font-sans text-[12px] text-ink-muted transition-colors hover:bg-[var(--hover-ghost)]"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {(plan.installments ?? [])
                .slice()
                .sort((a, b) => a.sequence - b.sequence)
                .map((inst) => (
                  <div
                    key={inst.id}
                    className="mt-[6px] flex items-center justify-between rounded-[6px] border border-line-soft px-[10px] py-[6px]"
                  >
                    <p className="m-0 min-w-0 truncate font-sans text-[13px] leading-[19px] text-ink">
                      {inst.label}
                      <span className="pl-[6px] text-[12px] text-ink-muted">
                        {Number(inst.percentage)}% · {dueLabel(inst.due_rule)}
                      </span>
                    </p>
                    {isAdmin && (
                      <button
                        type="button"
                        aria-label={`Delete installment ${inst.label}`}
                        onClick={async () => {
                          const result = await deletePlanInstallment(inst.id);
                          if (result.error) setToast({ message: result.error, tone: "alert" });
                          else
                            setLocalPlans((prev) =>
                              prev.map((p) =>
                                p.id === plan.id
                                  ? {
                                      ...p,
                                      installments: (p.installments ?? []).filter(
                                        (x) => x.id !== inst.id
                                      ),
                                    }
                                  : p
                              )
                            );
                        }}
                        className="shrink-0 rounded-[4px] px-[6px] py-[2px] font-sans text-[12px] text-ink-muted transition-colors hover:bg-[var(--hover-ghost)]"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}

              <div className="mt-[8px] flex gap-[6px]">
                <input
                  value={d.label}
                  onChange={(e) => setDraft(plan.id, { label: e.target.value })}
                  placeholder="Installment label"
                  className={`${inputCls} min-w-0 flex-1`}
                />
                <input
                  value={d.pct}
                  onChange={(e) => setDraft(plan.id, { pct: e.target.value.replace(/[^0-9.]/g, "") })}
                  placeholder="%"
                  inputMode="decimal"
                  className={`${inputCls} w-[56px]`}
                />
                <select
                  value={d.due}
                  onChange={(e) => setDraft(plan.id, { due: e.target.value })}
                  className={`${inputCls} w-[120px]`}
                >
                  {DUE_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!d.label.trim() || !d.pct || Number(d.pct) <= 0}
                  onClick={async () => {
                    const sequence = (plan.installments ?? []).length + 1;
                    const result = await addPlanInstallment(plan.id, {
                      label: d.label,
                      percentage: Number(d.pct),
                      dueRule: d.due,
                      sequence,
                    });
                    if (result.error || !result.id) {
                      setToast({ message: result.error ?? "failed", tone: "alert" });
                      return;
                    }
                    setLocalPlans((prev) =>
                      prev.map((p) =>
                        p.id === plan.id
                          ? {
                              ...p,
                              installments: [
                                ...(p.installments ?? []),
                                {
                                  id: result.id!,
                                  plan_id: plan.id,
                                  sequence,
                                  label: d.label.trim(),
                                  percentage: Number(d.pct),
                                  due_rule: d.due,
                                  created_at: new Date().toISOString(),
                                },
                              ],
                            }
                          : p
                      )
                    );
                    setDraft(plan.id, { label: "", pct: "" });
                  }}
                  className="h-[32px] shrink-0 rounded-[4px] bg-teal-deep px-[10px] font-sans text-[13px] text-white transition-opacity disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {toast && (
        <SuccessToast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
