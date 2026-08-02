"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useServerState } from "@/lib/use-server-state";
import { canAnimate } from "@/lib/motion";
import { Surface } from "@/components/shell/AppChrome";
import { AiFloaty } from "@/components/shell/AiFloaty";
import { BoardHeader } from "@/components/crm/leads/BoardHeader";
import { Icon } from "@/components/ui/Icon";
import { DealDrawer } from "./deal-drawer";
import { InlineEdit, OwnerCell, Popover } from "@/components/crm/leads/cells";
import { SuccessToast } from "@/components/ui/SuccessToast";
import { applyRowEdit } from "@/components/crm/persist";
import { canEditRow, OWNER_ONLY_MESSAGE } from "@/lib/permissions";
import { updateDeal } from "@/app/(app)/crm/offers/actions";
import {
  addDownpaymentPart,
  deleteDownpaymentPart,
} from "@/app/(app)/crm/deals/payment-actions";
import { compactMoney, money, DEAL_NAME_COL_W } from "./deals-config";
import { NumberCell } from "./deal-cells";
import {
  bedroomLabel,
  propertyTypeLabel,
} from "@/components/crm/contacts/demand-config";
import type { CrmContact, CrmDeal, CrmDealDownpayment, CrmDealStage, CrmUnit, CrmUser } from "@/lib/types";
import { countryFlag } from "@/components/crm/country-cell";

const ROW_H = 36;
const STRIPE = "#00a0a0";

const COLS: { key: string; label: string; w: number }[] = [
  { key: "owner", label: "Owner", w: 98 },
  { key: "client", label: "Client", w: 180 },
  { key: "country", label: "Country", w: 130 },
  { key: "developer", label: "Developer", w: 170 },
  { key: "offer", label: "Accepted offer", w: 190 },
  { key: "price", label: "Offer price", w: 130 },
  { key: "dp_percent", label: "Downpayment %", w: 130 },
  { key: "dp_amount", label: "Downpayment", w: 130 },
  { key: "paid", label: "Paid", w: 160 },
  { key: "remaining", label: "Remaining", w: 130 },
  { key: "payments", label: "Payments", w: 140 },
  // once the downpayment is complete, the developer must be invoiced —
  // this column is the reminder and the "done" stamp in one place
  { key: "invoice", label: "Invoice", w: 200 },
  { key: "accepted", label: "Accepted", w: 110 },
];

/** the downpayment target for a row — null until price AND percent are set */
function downpaymentOf(deal: CrmDeal): number | null {
  if (deal.deal_value == null || deal.downpayment_percent == null) return null;
  return Math.round(Number(deal.deal_value) * Number(deal.downpayment_percent)) / 100;
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function shortDate(value: string): string {
  return new Date(value.includes("T") ? value : `${value}T00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

/**
 * Part payments popover: Part 1, Part 2, ... toward the deal's downpayment.
 * Adding writes the real row before the list updates, so a refused write
 * (not your deal) never shows a phantom payment.
 */
function PaymentsCell({
  deal,
  parts,
  target,
  canEdit,
  onAdded,
  onDeleted,
  onError,
}: {
  deal: CrmDeal;
  parts: CrmDealDownpayment[];
  target: number | null;
  canEdit: boolean;
  onAdded: (row: CrmDealDownpayment) => void;
  onDeleted: (partId: string) => void;
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [amountDraft, setAmountDraft] = useState("");
  const [dateDraft, setDateDraft] = useState(localToday());
  const [saving, setSaving] = useState(false);

  const paid = parts.reduce((s, p) => s + Number(p.amount), 0);

  const add = async () => {
    const amount = Number(amountDraft);
    if (!amountDraft.trim() || !Number.isFinite(amount) || amount <= 0) {
      onError("Enter an amount above zero.");
      return;
    }
    setSaving(true);
    const result = await addDownpaymentPart(deal.id, amount, dateDraft);
    setSaving(false);
    if (result.error || !result.row) {
      onError(result.error ?? "could not save the payment");
      return;
    }
    onAdded(result.row);
    setAmountDraft("");
    setDateDraft(localToday());
  };

  return (
    <div className="relative size-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex size-full items-center justify-center gap-[6px] font-sans text-[13px] leading-[20px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
      >
        <span className="rounded-[10px] bg-cyan-soft px-[8px] py-[2px]">
          {parts.length === 0 ? "+ Add payment" : `${parts.length} part${parts.length > 1 ? "s" : ""}`}
        </span>
      </button>

      <Popover open={open} onClose={() => setOpen(false)} className="w-[320px]">
        <p className="m-0 pb-[6px] font-sans text-[13px] font-medium leading-[18px] text-ink">
          Downpayment payments
        </p>
        {target != null && (
          <p className="m-0 pb-[8px] font-sans text-[12px] leading-[16px] text-ink-muted">
            {money(paid, deal.currency)} of {money(target, deal.currency)} collected
          </p>
        )}
        {parts.length === 0 && (
          <p className="m-0 py-[6px] font-sans text-[12.5px] text-ink-muted">
            No payments yet — record Part 1 below.
          </p>
        )}
        {parts.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-[8px] border-b border-line-soft py-[6px] font-sans text-[13px] last:border-b-0"
          >
            <span className="w-[52px] shrink-0 text-ink-muted">Part {p.part_no}</span>
            <span className="min-w-0 flex-1 truncate text-ink">{money(Number(p.amount), p.currency)}</span>
            <span className="shrink-0 text-[12px] text-ink-muted">{shortDate(p.paid_at)}</span>
            {canEdit && (
              <button
                type="button"
                aria-label={`Delete part ${p.part_no}`}
                onClick={() => onDeleted(p.id)}
                className="shrink-0 rounded-[4px] px-[4px] text-[12px] text-alert transition-colors hover:bg-[var(--hover-ghost)]"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {canEdit && (
          <div className="flex items-center gap-[6px] pt-[10px]">
            <input
              value={amountDraft}
              onChange={(e) => setAmountDraft(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              placeholder={`Part ${parts.length + 1} amount`}
              className="h-[30px] min-w-0 flex-1 rounded-[4px] border border-line-strong px-[8px] font-sans text-[13px] text-ink outline-none focus:border-teal-deep"
            />
            <input
              type="date"
              value={dateDraft}
              onChange={(e) => setDateDraft(e.target.value)}
              className="h-[30px] w-[130px] shrink-0 rounded-[4px] border border-line-strong px-[6px] font-sans text-[12.5px] text-ink outline-none focus:border-teal-deep"
            />
            <button
              type="button"
              disabled={saving}
              onClick={add}
              className="h-[30px] shrink-0 rounded-[4px] bg-teal-deep px-[10px] font-sans text-[13px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "…" : "Add"}
            </button>
          </div>
        )}
      </Popover>
    </div>
  );
}

export function AcceptedDealsBoard({
  profile,
  deals,
  contacts,
  users,
  payments,
  stages = [],
  units = [],
}: {
  profile: CrmUser;
  deals: CrmDeal[];
  contacts: CrmContact[];
  users: CrmUser[];
  payments: CrmDealDownpayment[];
  stages?: CrmDealStage[];
  units?: CrmUnit[];
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [localDeals, setLocalDeals] = useServerState(deals);
  const [localPayments, setLocalPayments] = useServerState(payments);
  const [search, setSearch] = useState("");
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone?: "success" | "alert"; undo?: () => void } | null>(null);
  const [openDealId, setOpenDealId] = useState<string | null>(null);

  useGSAP(
    () => {
      if (!canAnimate()) return;
      gsap.from(".board-anim", {
        y: 8,
        opacity: 0,
        duration: 0.22,
        stagger: 0.04,
        ease: "power2.out",
        clearProps: "all",
      });
    },
    { scope: rootRef }
  );

  const userById = new Map(users.map((u) => [u.id, u]));

  const patchDeal = (dealId: string, patch: Partial<CrmDeal>, silent = false) => {
    const prev = localDeals.find((d) => d.id === dealId);
    if (prev && !canEditRow(profile, prev)) {
      setToast({ message: OWNER_ONLY_MESSAGE, tone: "alert" });
      return;
    }
    return applyRowEdit<CrmDeal>({
      id: dealId,
      patch,
      prev,
      setRows: setLocalDeals,
      save: updateDeal,
      setToast,
      silent,
    });
  };

  const deletePart = async (deal: CrmDeal, partId: string) => {
    const prev = localPayments;
    setLocalPayments((parts) => parts.filter((p) => p.id !== partId));
    const result = await deleteDownpaymentPart(partId);
    if (result.error) {
      setLocalPayments(prev);
      setToast({ message: result.error, tone: "alert" });
    } else {
      setToast({ message: `Payment removed from ${deal.name}` });
    }
  };

  const q = search.trim().toLowerCase();
  const visible = localDeals.filter(
    (d) =>
      (!q ||
        d.name.toLowerCase().includes(q) ||
        (d.contact_name ?? "").toLowerCase().includes(q) ||
        (d.account_name ?? "").toLowerCase().includes(q)) &&
      (!personFilter || d.owner_id === personFilter)
  );

  const cellBorder = "border-b border-r border-line";

  return (
    <Surface>
      <div ref={rootRef} className="flex h-full flex-col">
        <div className="board-anim">
          <BoardHeader
            profile={profile}
            title="Deals"
            tabs={["Main table"]}
            activeTab="Main table"
            onTabChange={() => {}}
            newLabel="New offer"
            searchValue={search}
            onSearch={setSearch}
            users={users}
            personFilter={personFilter}
            onPersonFilter={setPersonFilter}
            // deals only arrive by accepting an offer — the button goes there
            onNew={() => router.push("/crm/offers")}
          />
        </div>

        <div className="thin-scroll board-anim min-h-0 flex-1 overflow-auto bg-white pl-[40px] pt-[8px]">
          {visible.length === 0 ? (
            <div className="max-w-[520px] rounded-[8px] border border-line bg-canvas px-[20px] py-[18px]">
              <p className="m-0 font-sans text-[14px] leading-[21px] text-ink">
                No deals yet.
              </p>
              <p className="m-0 pt-[4px] font-sans text-[13px] leading-[19px] text-ink-muted">
                A deal is an offer the client accepted — press{" "}
                <span className="font-medium text-ink">Move to deal</span> on the Offers board and
                the row appears here with its downpayment tracker.
              </p>
            </div>
          ) : (
            <section className="pb-[40px]">
              <div className="sticky left-0 flex h-[40px] w-fit items-center pl-[5px]">
                <span
                  className="font-display text-[18px] font-medium leading-[24px] tracking-[-0.1px]"
                  style={{ color: STRIPE }}
                >
                  Accepted offers
                </span>
                <span className="pl-[8px] font-sans text-[14px] leading-[22px] text-ink-muted">
                  {visible.length} deal{visible.length > 1 ? "s" : ""}
                </span>
              </div>

              {/* column headers */}
              <div className="flex h-[36px] w-fit items-stretch">
                <div
                  className="sticky left-0 z-10 flex items-stretch bg-white"
                  style={{ width: DEAL_NAME_COL_W }}
                >
                  <span className="w-[6px] shrink-0 rounded-tl-[6px]" style={{ backgroundColor: STRIPE }} />
                  <span className="flex flex-1 items-center justify-center border-b border-r border-t border-line font-sans text-[14px] leading-[20px] text-ink">
                    Deal
                  </span>
                </div>
                {COLS.map((col) => (
                  <span
                    key={col.key}
                    className="flex items-center justify-center whitespace-nowrap border-b border-r border-t border-line bg-white px-[4px] font-sans text-[14px] leading-[20px] text-ink"
                    style={{ width: col.w }}
                  >
                    {col.label}
                  </span>
                ))}
              </div>

              {/* rows */}
              {visible.map((deal) => {
                const owner = deal.owner_id ? userById.get(deal.owner_id) : undefined;
                const client =
                  contacts.find((c) => c.id === deal.contact_id) ??
                  contacts.find(
                    (c) =>
                      !!deal.contact_name &&
                      c.name.trim().toLowerCase() === deal.contact_name.trim().toLowerCase()
                  );
                const parts = localPayments.filter((p) => p.deal_id === deal.id);
                const paid = parts.reduce((s, p) => s + Number(p.amount), 0);
                const target = downpaymentOf(deal);
                const remaining = target == null ? null : Math.max(0, target - paid);
                const complete = target != null && target > 0 && paid >= target;
                const offerBits = [
                  propertyTypeLabel(deal.offer_property_type),
                  bedroomLabel(deal.offer_bedrooms),
                ].filter((v) => v !== "—");
                const canEdit = canEditRow(profile, deal);

                return (
                  <div key={deal.id} className="group/row flex w-fit items-stretch" style={{ height: ROW_H }}>
                    <div
                      className="sticky left-0 z-10 flex items-stretch bg-white"
                      style={{ width: DEAL_NAME_COL_W }}
                    >
                      <span className="w-[6px] shrink-0" style={{ backgroundColor: STRIPE }} />
                      <span className="flex min-w-0 flex-1 items-center justify-between border-b border-r border-line px-[10px] transition-colors group-hover/row:bg-canvas">
                        <InlineEdit
                          value={deal.name}
                          onSave={(name) => patchDeal(deal.id, { name })}
                          className="min-w-0 flex-1 font-sans text-[14px] leading-[20px] text-ink"
                        />
                        <button
                          type="button"
                          aria-label={`Open ${deal.name}`}
                          onClick={() => setOpenDealId(deal.id)}
                          className="flex size-[24px] shrink-0 items-center justify-center rounded-[4px] opacity-0 transition-opacity hover:bg-[var(--hover-ghost)] group-hover/row:opacity-100"
                        >
                          <Icon name="rowOpen" size={16} />
                        </button>
                      </span>
                    </div>

                    {COLS.map((col) => {
                      const w = { width: col.w };
                      switch (col.key) {
                        case "owner":
                          return (
                            <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                              <OwnerCell
                                owner={owner}
                                users={users}
                                onSelect={(ownerId) => patchDeal(deal.id, { owner_id: ownerId })}
                              />
                            </span>
                          );
                        case "client":
                          return (
                            <span
                              key={col.key}
                              className={`${cellBorder} flex items-center justify-center truncate px-[8px] font-sans text-[14px] leading-[20px]`}
                              style={w}
                              title={client ? "From the accepted offer" : undefined}
                            >
                              {deal.contact_name ? (
                                <span className="truncate border-b border-[#037f4c] text-ink">
                                  {deal.contact_name}
                                </span>
                              ) : (
                                <span className="text-ink-muted">—</span>
                              )}
                            </span>
                          );
                        case "country":
                          return (
                            <span
                              key={col.key}
                              className={`${cellBorder} flex items-center justify-center gap-[5px] truncate bg-canvas px-[6px] font-sans text-[13px] leading-[20px] text-ink`}
                              style={w}
                              title="From the client's profile — edit it on the Contacts board"
                            >
                              {client?.country ? (
                                <>
                                  <span aria-hidden>{countryFlag(client.country)}</span>
                                  <span className="truncate">{client.country}</span>
                                </>
                              ) : (
                                <span className="text-ink-muted">—</span>
                              )}
                            </span>
                          );
                        case "developer":
                          return (
                            <span
                              key={col.key}
                              className={`${cellBorder} flex items-center justify-center truncate px-[8px] font-sans text-[14px] leading-[20px]`}
                              style={w}
                            >
                              {deal.account_name ? (
                                <span className="truncate text-ink">{deal.account_name}</span>
                              ) : (
                                <span className="text-ink-muted">—</span>
                              )}
                            </span>
                          );
                        case "offer":
                          return (
                            <span
                              key={col.key}
                              className={`${cellBorder} flex items-center justify-center gap-[4px] bg-canvas px-[6px]`}
                              style={w}
                              title="The accepted offer — edit it on the Offers board"
                            >
                              {offerBits.length === 0 ? (
                                <span className="font-sans text-[13px] text-ink-muted">—</span>
                              ) : (
                                offerBits.map((v) => (
                                  <span
                                    key={v}
                                    className="truncate rounded-[10px] bg-white px-[8px] py-[2px] font-sans text-[12px] leading-[18px] text-ink"
                                  >
                                    {v}
                                  </span>
                                ))
                              )}
                            </span>
                          );
                        case "price":
                          return (
                            <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                              <NumberCell
                                value={deal.deal_value == null ? null : Number(deal.deal_value)}
                                format={(v) => compactMoney(v, deal.currency)}
                                title={deal.deal_value == null ? undefined : money(Number(deal.deal_value), deal.currency)}
                                onSave={(next) => patchDeal(deal.id, { deal_value: next })}
                              />
                            </span>
                          );
                        case "dp_percent":
                          return (
                            <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                              <NumberCell
                                value={
                                  deal.downpayment_percent == null
                                    ? null
                                    : Number(deal.downpayment_percent)
                                }
                                format={(v) => (v == null ? "" : `${v}%`)}
                                title="Set by the developer's terms — 10%, 20%, ..."
                                onSave={(next) => {
                                  if (next != null && (next < 0 || next > 100)) {
                                    setToast({ message: "Percent must be between 0 and 100.", tone: "alert" });
                                    return;
                                  }
                                  patchDeal(deal.id, { downpayment_percent: next });
                                }}
                              />
                            </span>
                          );
                        case "dp_amount":
                          return (
                            <span
                              key={col.key}
                              className={`${cellBorder} flex items-center justify-center truncate bg-canvas px-[6px] font-sans text-[14px] leading-[20px] text-ink`}
                              style={w}
                              title={
                                target == null
                                  ? "Needs the offer price and the percent"
                                  : `${money(target, deal.currency)} = ${compactMoney(Number(deal.deal_value), deal.currency)} × ${Number(deal.downpayment_percent)}%`
                              }
                            >
                              {target == null ? (
                                <span className="text-ink-muted">—</span>
                              ) : (
                                compactMoney(target, deal.currency)
                              )}
                            </span>
                          );
                        case "paid":
                          return (
                            <span
                              key={col.key}
                              className={`${cellBorder} flex flex-col items-center justify-center gap-[3px] bg-white px-[8px]`}
                              style={w}
                              title={target != null ? `${money(paid, deal.currency)} of ${money(target, deal.currency)}` : money(paid, deal.currency)}
                            >
                              <span className="max-w-full truncate font-sans text-[12.5px] leading-[16px] text-ink">
                                {compactMoney(paid, deal.currency)}
                                {target != null && (
                                  <span className="text-ink-muted"> of {compactMoney(target, deal.currency)}</span>
                                )}
                              </span>
                              {target != null && target > 0 && (
                                <span className="h-[5px] w-full overflow-hidden rounded-[3px] bg-line-soft">
                                  <span
                                    className="block h-full rounded-[3px]"
                                    style={{
                                      width: `${Math.min(100, Math.round((paid / target) * 100))}%`,
                                      backgroundColor: complete ? "#00c875" : "#00a0a0",
                                    }}
                                  />
                                </span>
                              )}
                            </span>
                          );
                        case "remaining":
                          return (
                            <span
                              key={col.key}
                              className={`${cellBorder} flex items-center justify-center bg-white px-[6px] font-sans text-[13px] leading-[20px]`}
                              style={w}
                            >
                              {remaining == null ? (
                                <span className="text-ink-muted">—</span>
                              ) : complete ? (
                                <span className="max-w-full truncate rounded-[10px] bg-[#00c875] px-[8px] py-[2px] text-white">
                                  Complete ✓
                                </span>
                              ) : (
                                <span
                                  className="max-w-full truncate rounded-[10px] bg-[#fdab3d] px-[8px] py-[2px] text-white"
                                  title={money(remaining, deal.currency)}
                                >
                                  {compactMoney(remaining, deal.currency)} left
                                </span>
                              )}
                            </span>
                          );
                        case "payments":
                          return (
                            <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                              <PaymentsCell
                                deal={deal}
                                parts={parts}
                                target={target}
                                canEdit={canEdit}
                                onAdded={(row) => {
                                  setLocalPayments((prev) => [...prev, row]);
                                  // the moment the last part covers the target,
                                  // point the agent at the next step
                                  const nowPaid = paid + Number(row.amount);
                                  setToast(
                                    target != null && target > 0 && nowPaid >= target
                                      ? {
                                          message: `Downpayment complete on ${deal.name} — send the invoice to ${deal.account_name ?? "the developer"}`,
                                        }
                                      : { message: `Part ${row.part_no} recorded on ${deal.name}` }
                                  );
                                }}
                                onDeleted={(partId) => deletePart(deal, partId)}
                                onError={(message) => setToast({ message, tone: "alert" })}
                              />
                            </span>
                          );
                        case "invoice":
                          return (
                            <span
                              key={col.key}
                              className={`${cellBorder} flex items-center justify-center bg-white px-[6px] font-sans text-[13px] leading-[20px]`}
                              style={w}
                            >
                              {deal.invoice_sent_at ? (
                                <span
                                  className="max-w-full truncate rounded-[10px] bg-[#00c875] px-[8px] py-[2px] text-white"
                                  title={`Sent ${shortDate(deal.invoice_sent_at)}`}
                                >
                                  Invoice sent ✓
                                </span>
                              ) : complete ? (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const saved = await patchDeal(
                                      deal.id,
                                      { invoice_sent_at: new Date().toISOString() },
                                      true
                                    );
                                    if (saved) {
                                      setToast({
                                        message: `Invoice to ${deal.account_name ?? "the developer"} marked sent`,
                                        undo: () => {
                                          patchDeal(deal.id, { invoice_sent_at: null }, true);
                                        },
                                      });
                                    }
                                  }}
                                  className="h-[28px] w-full truncate rounded-[4px] bg-[#fdab3d] px-[8px] font-sans text-[12.5px] font-medium text-white transition-colors hover:bg-[#e8983a]"
                                >
                                  Send invoice to developer
                                </button>
                              ) : (
                                <span
                                  className="text-ink-muted"
                                  title="Appears when the downpayment is complete"
                                >
                                  —
                                </span>
                              )}
                            </span>
                          );
                        case "accepted":
                          return (
                            <span
                              key={col.key}
                              className={`${cellBorder} flex items-center justify-center bg-white px-[6px] font-sans text-[13px] text-ink-muted`}
                              style={w}
                              title={deal.accepted_at ?? undefined}
                            >
                              {deal.accepted_at ? shortDate(deal.accepted_at) : "—"}
                            </span>
                          );
                        default:
                          return <span key={col.key} className={`${cellBorder} block bg-white`} style={w} />;
                      }
                    })}
                  </div>
                );
              })}

              {/* summary row */}
              <div className="flex w-fit items-stretch" style={{ height: ROW_H }}>
                <span className="sticky left-0 z-10 block bg-white" style={{ width: DEAL_NAME_COL_W }} />
                {COLS.map((col) => {
                  const totals = (() => {
                    if (col.key === "price")
                      return visible.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
                    if (col.key === "dp_amount")
                      return visible.reduce((s, d) => s + (downpaymentOf(d) ?? 0), 0);
                    if (col.key === "paid")
                      return visible.reduce(
                        (s, d) =>
                          s +
                          localPayments
                            .filter((p) => p.deal_id === d.id)
                            .reduce((x, p) => x + Number(p.amount), 0),
                        0
                      );
                    return null;
                  })();
                  return (
                    <span
                      key={col.key}
                      className="flex flex-col items-center justify-center border-b border-r border-line bg-white"
                      style={{ width: col.w }}
                    >
                      {totals != null && totals > 0 && (
                        <>
                          <span className="font-sans text-[13px] leading-[16px] text-ink" title={money(totals)}>
                            {compactMoney(totals)}
                          </span>
                          <span className="font-sans text-[11px] leading-[13px] text-ink-muted">sum</span>
                        </>
                      )}
                    </span>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>

      {toast && (
        <SuccessToast
          message={toast.message}
          tone={toast.tone}
          onUndo={toast.undo}
          onClose={() => setToast(null)}
        />
      )}
      {openDealId && (() => {
        const openDeal = localDeals.find((d) => d.id === openDealId);
        if (!openDeal) return null;
        return (
          <DealDrawer
            deal={openDeal}
            profile={profile}
            stages={stages}
            users={users}
            units={units}
            onClose={() => setOpenDealId(null)}
            onToast={(message, tone) => setToast({ message, tone })}
          />
        );
      })()}
      <AiFloaty />
    </Surface>
  );
}
