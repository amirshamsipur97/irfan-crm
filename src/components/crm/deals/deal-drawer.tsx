"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { canAnimate } from "@/lib/motion";
import { money } from "./deals-config";
import { shortDate } from "@/components/crm/leads/board-config";
import { activityTime } from "@/components/crm/activities/activities-config";
import type {
  CrmActivityItem,
  CrmDeal,
  CrmDealStage,
  CrmOffer,
  CrmUser,
  CrmViewing,
} from "@/lib/types";
import { DealFinancials } from "./deal-financials";
import { canViewFinance } from "@/lib/permissions";
import {
  addDealOffer,
  addDealViewing,
  getDealRelations,
  setOfferStatus,
  type DrawerClient,
} from "@/app/(app)/crm/offers/drawer-actions";
import { countryFlag } from "@/components/crm/country-cell";
import { ageLabel, genderLabel } from "@/lib/person-fields";
import { TemperaturePill } from "@/components/crm/temperature-pill";

const OFFER_COLORS: Record<string, string> = {
  draft: "#c4c4c4",
  submitted: "#579bfc",
  countered: "#fdab3d",
  accepted: "#00c875",
  rejected: "#e2445c",
  withdrawn: "#676879",
  expired: "#bb3354",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="m-0 pb-[8px] pt-[20px] font-display text-[14px] font-semibold leading-[20px] text-ink">
      {children}
    </h4>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-[8px] py-[3px]">
      <span className="w-[120px] shrink-0 font-sans text-[12px] leading-[18px] text-ink-muted">
        {label}
      </span>
      <span className="min-w-0 flex-1 truncate font-sans text-[13px] leading-[19px] text-ink">
        {children}
      </span>
    </div>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex h-[22px] items-center rounded-[12px] px-[10px] font-sans text-[12px] leading-[16px] text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}

export function DealDrawer({
  deal,
  profile,
  stages,
  users,
  onClose,
  onToast,
}: {
  deal: CrmDeal;
  profile: CrmUser;
  stages: CrmDealStage[];
  users: CrmUser[];
  onClose: () => void;
  onToast: (message: string, tone?: "success" | "alert") => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [offers, setOffers] = useState<CrmOffer[]>([]);
  const [viewings, setViewings] = useState<CrmViewing[]>([]);
  const [activities, setActivities] = useState<CrmActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<DrawerClient | null>(null);
  const [offerAmount, setOfferAmount] = useState("");

  const stage = stages.find((s) => s.id === deal.stage_id);
  const owner = users.find((u) => u.id === deal.owner_id);

  const reload = async () => {
    const data = await getDealRelations(deal.id);
    setOffers(data.offers);
    setViewings(data.viewings);
    setActivities(data.activities);
    setClient(data.client);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal.id]);

  useGSAP(
    () => {
      if (!canAnimate() || !panelRef.current) return;
      gsap.from(panelRef.current, { x: 40, opacity: 0, duration: 0.28, ease: "power2.out", clearProps: "all" });
    },
    { scope: panelRef }
  );

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label="Close deal panel"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/20"
      />
      <div
        ref={panelRef}
        className="thin-scroll absolute right-0 top-0 flex h-full w-[460px] flex-col overflow-y-auto bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.15)]"
      >
        {/* header */}
        <div className="sticky top-0 z-10 border-b border-line bg-white px-[24px] pb-[14px] pt-[18px]">
          <div className="flex items-start justify-between gap-[8px]">
            <h3 className="m-0 font-display text-[20px] font-medium leading-[28px] text-ink">
              {deal.name}
            </h3>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex size-[28px] shrink-0 items-center justify-center rounded-[4px] transition-colors hover:bg-[var(--hover-ghost)]"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M3 3l8 8M11 3l-8 8" stroke="#323338" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="mt-[8px] flex flex-wrap items-center gap-[8px] font-sans text-[13px] text-ink-muted">
            {stage && <Pill label={stage.name} color={stage.color} />}
            <span>{money(deal.deal_value, deal.currency)}</span>
            {/* multi-unit offers: say so, and spell out the per-unit price so
                nobody reads the total as the price of one apartment */}
            {(deal.unit_count ?? 1) > 1 && deal.deal_value != null && (
              <span>
                · {deal.unit_count} units ({money(Number(deal.deal_value) / deal.unit_count, deal.currency)} each)
              </span>
            )}
            {deal.project_name && <span>· {deal.project_name}</span>}
            {owner && <span>· {owner.full_name}</span>}
            {deal.expected_close_date && <span>· closes {shortDate(deal.expected_close_date)}</span>}
            {deal.contact_name && <span>· {deal.contact_name}</span>}
          </div>
        </div>

        <div className="flex-1 px-[24px] pb-[32px]">
          {/* who this offer is for — read-only, edited on the Contacts board */}
          {client && (
            <>
              <SectionTitle>Client</SectionTitle>
              <DetailRow label="Name">
                {client.name}
                {client.code && (
                  <span className="pl-[6px] font-sans text-[11px] text-ink-muted">{client.code}</span>
                )}
              </DetailRow>
              <DetailRow label="Country">
                {client.country ? (
                  <>
                    <span aria-hidden>{countryFlag(client.country)}</span> {client.country}
                  </>
                ) : (
                  "—"
                )}
              </DetailRow>
              <DetailRow label="Status">
                <TemperaturePill value={client.temperature} />
              </DetailRow>
              <DetailRow label="Gender">{genderLabel(client.gender)}</DetailRow>
              <DetailRow label="Age">{ageLabel(client.age)}</DetailRow>
              <DetailRow label="Phone">
                {client.phone ? (
                  <a
                    href={`tel:${client.country_code ?? ""}${client.phone}`}
                    className="text-[#0073ea] hover:underline"
                  >
                    {client.country_code ? `${client.country_code} ` : ""}
                    {client.phone}
                  </a>
                ) : (
                  "—"
                )}
              </DetailRow>
              <DetailRow label="Email">
                {client.email ? (
                  <a href={`mailto:${client.email}`} className="truncate text-[#0073ea] hover:underline">
                    {client.email}
                  </a>
                ) : (
                  "—"
                )}
              </DetailRow>
            </>
          )}

          {loading ? (
            <p className="pt-[24px] font-sans text-[14px] text-ink-muted">Loading…</p>
          ) : (
            <>
              {/* offers */}
              <SectionTitle>Offers</SectionTitle>
              {offers.length === 0 && (
                <p className="m-0 font-sans text-[13px] text-ink-muted">No offers yet.</p>
              )}
              {offers.map((o) => (
                <div
                  key={o.id}
                  className="mt-[6px] flex items-center justify-between rounded-[6px] border border-line px-[12px] py-[8px]"
                >
                  <div>
                    <p className="m-0 font-sans text-[14px] leading-[20px] text-ink">
                      {money(o.amount, o.currency)}
                    </p>
                    <p className="m-0 font-sans text-[12px] leading-[16px] text-ink-muted">
                      {o.submitted_at ? shortDate(o.submitted_at) : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-[6px]">
                    <Pill label={o.status} color={OFFER_COLORS[o.status] ?? "#676879"} />
                    {(o.status === "submitted" || o.status === "countered") && (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            await setOfferStatus(o.id, "accepted");
                            onToast("Offer accepted");
                            reload();
                          }}
                          className="rounded-[4px] px-[6px] py-[2px] font-sans text-[12px] text-brand transition-colors hover:bg-[var(--hover-ghost)]"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await setOfferStatus(o.id, "rejected");
                            reload();
                          }}
                          className="rounded-[4px] px-[6px] py-[2px] font-sans text-[12px] text-alert transition-colors hover:bg-[var(--hover-ghost)]"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div className="mt-[8px] flex gap-[6px]">
                <input
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="Offer amount (OMR)"
                  inputMode="decimal"
                  className="h-[32px] min-w-0 flex-1 rounded-[4px] border border-line-strong px-[8px] font-sans text-[13px] text-ink outline-none focus:border-teal-deep"
                />
                <button
                  type="button"
                  disabled={!offerAmount || Number(offerAmount) <= 0}
                  onClick={async () => {
                    // inventory is not tracked per unit, so offers carry no unit link
                    const result = await addDealOffer(deal.id, Number(offerAmount), null);
                    if (result.error) onToast(result.error, "alert");
                    else onToast("Offer submitted");
                    setOfferAmount("");
                    reload();
                  }}
                  className="h-[32px] shrink-0 rounded-[4px] bg-teal-deep px-[12px] font-sans text-[13px] text-white transition-opacity disabled:opacity-40"
                >
                  Submit
                </button>
              </div>

              {/* viewings */}
              <SectionTitle>Viewings</SectionTitle>
              {viewings.length === 0 && (
                <p className="m-0 font-sans text-[13px] text-ink-muted">No viewings linked yet.</p>
              )}
              {viewings.map((v) => (
                <div
                  key={v.id}
                  className="mt-[6px] flex items-center justify-between rounded-[6px] border border-line px-[12px] py-[8px]"
                >
                  <div className="min-w-0">
                    <p className="m-0 truncate font-sans text-[14px] leading-[20px] text-ink">{v.name}</p>
                    <p className="m-0 font-sans text-[12px] leading-[16px] text-ink-muted">
                      {v.scheduled_start ? activityTime(v.scheduled_start) : "not scheduled"}
                      {v.unit_name ? ` · ${v.unit_name}` : ""}
                    </p>
                  </div>
                  <Pill
                    label={v.status.replace("_", " ")}
                    color={
                      { requested: "#66ccff", scheduled: "#579bfc", confirmed: "#00a0a0", completed: "#00c875", cancelled: "#e2445c", no_show: "#bb3354" }[v.status] ?? "#676879"
                    }
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={async () => {
                  const result = await addDealViewing(deal.id);
                  if (result.error) onToast(result.error, "alert");
                  else onToast("Viewing created — schedule it on the Viewings board");
                  reload();
                }}
                className="mt-[8px] rounded-[4px] border border-line-strong px-[10px] py-[5px] font-sans text-[13px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
              >
                + Request viewing
              </button>

              {/* financials — finance/admin only (tables are RLS-gated too) */}
              {canViewFinance(profile.role) && (
                <DealFinancials deal={deal} users={users} onToast={onToast} />
              )}

              {/* activity timeline */}
              <SectionTitle>Latest activity</SectionTitle>
              {activities.length === 0 && (
                <p className="m-0 font-sans text-[13px] text-ink-muted">No logged activity yet.</p>
              )}
              {activities.map((a) => (
                <div key={a.id} className="mt-[6px] flex items-center justify-between">
                  <p className="m-0 min-w-0 truncate pr-[8px] font-sans text-[13px] leading-[20px] text-ink">
                    {a.name}
                  </p>
                  <span className="shrink-0 font-sans text-[12px] text-ink-muted">
                    {a.start_at ? activityTime(a.start_at) : shortDate(a.created_at)}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
