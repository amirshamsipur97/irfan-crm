"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Surface } from "@/components/shell/AppChrome";
import { AiFloaty } from "@/components/shell/AiFloaty";
import { Icon } from "@/components/ui/Icon";
import { canAnimate } from "@/lib/motion";
import type { CrmUser } from "@/lib/types";
import {
  ActivityTrackerWidget,
  BarsWidget,
  FunnelWidget,
  GaugeWidget,
  ListWidget,
  MonthlyTargetWidget,
  PieWidget,
  StatWidget,
  Widget,
} from "./widgets";

export interface DashboardRow {
  primary: string;
  meta: string;
  tone?: "alert" | "normal";
}

export interface DashboardData {
  myWork: {
    overdue: DashboardRow[];
    quiet: DashboardRow[];
    viewings: DashboardRow[];
  };
  team: {
    avgFirstResponseHours: number | null;
    leadsByOwner: { label: string; value: number }[];
    lostReasons: DashboardRow[];
  } | null;
  annual: { actual: number; target: number };
  monthly: { actual: number; target: number };
  avgDealValue: number;
  /** true once a deal has been accepted — before that the tile averages offers */
  avgIsAccepted: boolean;
  activeForecast: number;
  /** downpayment cash actually recorded */
  collected: number;
  collectedThisYear: number;
  statusDistribution: { label: string; color: string; count: number }[];
  revenueByMonth: { label: string; value: number }[];
  funnel: { label: string; count: number; color: string }[];
  conversionToWon: number;
  forecastByMonth: { label: string; value: number }[];
  forecastGoal: number;
  forecastByStage: { label: string; color: string; value: number }[];
  activityEvents: { owner: string; type: string; at: string }[];
}

function HeaderButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="flex h-[36px] items-center gap-[8px] whitespace-nowrap rounded-[4px] border border-line-strong px-[12px] font-sans text-[14px] leading-[22px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
    >
      {children}
    </button>
  );
}

export function SalesDashboard({
  data,
  currency = "OMR",
}: {
  profile: CrmUser;
  data: DashboardData;
  currency?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!canAnimate()) return;
      gsap.from(".dash-widget", {
        y: 20,
        opacity: 0,
        duration: 0.4,
        stagger: 0.06,
        ease: "power2.out",
        clearProps: "all",
      });
    },
    { scope: rootRef }
  );

  return (
    <Surface>
      <div ref={rootRef} className="thin-scroll h-full overflow-y-auto">
        {/* dashboard header */}
        <div className="flex items-center justify-between px-[32px] pb-[8px] pt-[24px]">
          <span className="flex items-center gap-[10px]">
            <h1 className="font-display text-[24px] font-medium leading-[30px] tracking-[-0.1px] text-ink">
              Sales Dashboard
            </h1>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path
                d="M10 2.6l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L2.8 7.9l5-.7L10 2.6z"
                stroke="#676879"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="flex items-center gap-[8px]">
            <HeaderButton>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M8 10.5V2.5M8 2.5L5 5.4M8 2.5l3 2.9M3 10.5v2a1 1 0 001 1h8a1 1 0 001-1v-2" stroke="#323338" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Export
              <span className="text-[11px] text-ink-muted">⌄</span>
            </HeaderButton>
            <HeaderButton>
              <Icon name="invite" size={16} />
              Invite
            </HeaderButton>
            <button
              type="button"
              aria-label="Dashboard options"
              className="flex size-[36px] items-center justify-center rounded-[4px] transition-colors hover:bg-[var(--hover-ghost)]"
            >
              <span className="font-sans text-[18px] leading-none text-ink">⋯</span>
            </button>
          </span>
        </div>

        {/* toolbar */}
        <div className="flex items-center justify-between border-b border-line-soft px-[32px] pb-[12px]">
          <div className="flex items-center gap-[12px]">
            <button
              type="button"
              className="flex h-[36px] items-center gap-[8px] rounded-[4px] bg-teal-deep px-[12px] font-sans text-[14px] leading-[22px] text-white transition-colors hover:bg-[#006e87]"
            >
              <span className="text-[18px] leading-none">+</span> Add widget
            </button>
            <HeaderButton>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
                <rect x="2" y="2.5" width="12" height="11" rx="1.5" stroke="#323338" strokeWidth="1.3" />
                <path d="M6.5 2.5v11" stroke="#323338" strokeWidth="1.3" />
              </svg>
              1 connected board
            </HeaderButton>
            <span className="flex h-[36px] w-[220px] items-center gap-[8px] rounded-[4px] border border-line-strong px-[10px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/figma/imgVariant9.svg" alt="" width={14} height={14} />
              <input
                placeholder="Type to filter"
                className="w-full bg-transparent font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted"
              />
            </span>
            <span className="h-[22px] w-px bg-line" />
            <button type="button" className="flex h-[36px] items-center gap-[8px] rounded-[4px] px-[10px] font-sans text-[14px] text-ink transition-colors hover:bg-[var(--hover-ghost)]">
              <Icon name="bhPerson" size={20} className="w-[24px]" />
              People
            </button>
            <button type="button" className="flex h-[36px] items-center gap-[8px] rounded-[4px] px-[10px] font-sans text-[14px] text-ink transition-colors hover:bg-[var(--hover-ghost)]">
              <Icon name="bhFilter" size={14} className="w-[24px]" />
              Filter
            </button>
          </div>
          <Icon name="settings" size={20} />
        </div>

        {/* widget grid */}
        <div className="grid grid-cols-12 gap-[16px] p-[24px] pb-[64px]">
          {/* my work — SLA follow-through for the signed-in user */}
          <Widget title="My overdue follow-ups" className="col-span-4">
            <ListWidget rows={data.myWork.overdue} emptyText="No overdue follow-ups. Clean slate." />
          </Widget>
          <Widget title="My quiet leads (7d+)" className="col-span-4">
            <ListWidget rows={data.myWork.quiet} emptyText="Every lead has recent activity." />
          </Widget>
          <Widget title="My upcoming viewings" className="col-span-4">
            <ListWidget rows={data.myWork.viewings} emptyText="No viewings scheduled this week." />
          </Widget>

          {/* team health — admin & manager only */}
          {data.team && (
            <>
              <Widget title="Avg. first response" className="col-span-4">
                <div className="flex flex-1 items-center justify-center py-[24px]">
                  <p className="m-0 text-center">
                    <span className="font-display text-[34px] font-semibold leading-[40px] text-ink">
                      {data.team.avgFirstResponseHours == null
                        ? "—"
                        : data.team.avgFirstResponseHours < 1
                          ? `${Math.round(data.team.avgFirstResponseHours * 60)}m`
                          : `${data.team.avgFirstResponseHours.toFixed(1)}h`}
                    </span>
                    <span className="block pt-[4px] font-sans text-[12px] text-ink-muted">
                      lead assigned → first logged touch
                    </span>
                  </p>
                </div>
              </Widget>
              <Widget title="Open leads by owner" className="col-span-4">
                {data.team.leadsByOwner.length > 0 ? (
                  <BarsWidget bars={data.team.leadsByOwner} yLabel="Leads" format={(n) => `${Math.round(n)}`} />
                ) : (
                  <p className="py-[36px] text-center font-sans text-[13px] text-ink-muted">No open leads</p>
                )}
              </Widget>
              <Widget title="Lost reasons" className="col-span-4">
                <ListWidget rows={data.team.lostReasons} emptyText="No lost deals yet — no reasons to learn from." />
              </Widget>
            </>
          )}

          <Widget title="Annual Target (accepted deals)" className="col-span-5 min-h-[320px]">
            <GaugeWidget actual={data.annual.actual} target={data.annual.target} />
          </Widget>
          <Widget title="Monthly Target (accepted deals)" className="col-span-4 min-h-[320px]">
            <MonthlyTargetWidget actual={data.monthly.actual} target={data.monthly.target} />
          </Widget>
          <div className="col-span-3 flex flex-col gap-[16px]">
            <Widget
              title={data.avgIsAccepted ? "Average accepted deal" : "Average offer price"}
              className="flex-1"
            >
              <StatWidget value={data.avgDealValue} currency={currency} />
            </Widget>
            <Widget title="Open offers on the table" className="flex-1">
              <StatWidget value={data.activeForecast} currency={currency} />
            </Widget>
            <Widget title="Downpayments collected" className="flex-1">
              <StatWidget value={data.collected} currency={currency} />
            </Widget>
          </div>

          <Widget title="Offers by stage" className="col-span-6 min-h-[320px]">
            {data.statusDistribution.length > 0 ? (
              <PieWidget segments={data.statusDistribution} />
            ) : (
              <p className="py-[48px] text-center font-sans text-[14px] text-ink-muted">No deals yet</p>
            )}
          </Widget>
          <Widget title="Accepted deal value by month" className="col-span-6 min-h-[320px]">
            {data.revenueByMonth.length > 0 ? (
              <BarsWidget bars={data.revenueByMonth} yLabel="Accepted value" currency={currency} />
            ) : (
              <p className="py-[48px] text-center font-sans text-[14px] text-ink-muted">No deals accepted yet</p>
            )}
          </Widget>

          <Widget title="Sales funnel — leads to signed" className="col-span-12 min-h-[320px]">
            <FunnelWidget steps={data.funnel} conversionToWon={data.conversionToWon} />
          </Widget>

          <Widget title="Activity tracker" className="col-span-12">
            <ActivityTrackerWidget events={data.activityEvents} />
          </Widget>

          <Widget title="Open offers by expected close month" className="col-span-6 min-h-[320px]">
            {data.forecastByMonth.length > 0 ? (
              <BarsWidget bars={data.forecastByMonth} goal={data.forecastGoal} yLabel="Offer value" currency={currency} />
            ) : (
              <p className="py-[48px] text-center font-sans text-[14px] text-ink-muted">No open offers with a close date yet</p>
            )}
          </Widget>
          <Widget title="Open offers by stage" className="col-span-6 min-h-[320px]">
            {data.forecastByStage.length > 0 ? (
              <BarsWidget
                bars={data.forecastByStage.map((s) => ({ label: s.label, value: s.value, color: s.color === "#579bfc" ? "#579bfc" : "#66ccff" }))}
                yLabel="Forecast Value"
                currency={currency}
              />
            ) : (
              <p className="py-[48px] text-center font-sans text-[14px] text-ink-muted">No active deals yet</p>
            )}
          </Widget>
        </div>
      </div>
      <AiFloaty />
    </Surface>
  );
}
