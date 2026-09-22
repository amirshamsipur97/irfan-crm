"use client";

import type { CrmUser } from "@/lib/types";
import { todayLocalDateString } from "@/components/crm/activities/activities-config";
import { JOURNEY_STEPS, byAgent, funnel, pct, type LeadJourney } from "./lead-report";

type Range = { from: string | null; to: string | null };

const pad = (n: number) => String(n).padStart(2, "0");
const day = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** The windows a manager actually asks for, built from LOCAL dates. */
function presets(): { key: string; label: string; range: Range }[] {
  const today = todayLocalDateString();
  const now = new Date();
  const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  return [
    { key: "all", label: "All time", range: { from: null, to: null } },
    { key: "today", label: "Today", range: { from: today, to: today } },
    { key: "7d", label: "Last 7 days", range: { from: day(weekAgo), to: today } },
    { key: "month", label: "This month", range: { from: day(monthStart), to: today } },
    { key: "last", label: "Last month", range: { from: day(lastStart), to: day(lastEnd) } },
  ];
}

/**
 * The admin block at the top of the Leads Filter panel: a window on the day
 * each lead came in, the funnel for the leads in it, one line per agent, and
 * the Excel export of the same numbers.
 *
 * Shown to the full-access tier only (developer, CEO). The window also filters
 * the board itself, so the rows under the panel are the rows being counted.
 */
export function LeadReportSection({
  range,
  onRange,
  journeys,
  agentJourneys,
  selectedAgent,
  onAgent,
  loadError,
  users,
  onExport,
}: {
  range: Range;
  onRange: (next: Range) => void;
  /** the leads being counted and exported (narrowed to the picked agent); null while loading */
  journeys: LeadJourney[] | null;
  /** the same window before the agent pick, so every agent stays listed */
  agentJourneys: LeadJourney[] | null;
  /** the agent whose leads the report is narrowed to, if any */
  selectedAgent: string | null;
  onAgent: (agentId: string | null) => void;
  loadError: string | null;
  users: CrmUser[];
  onExport: () => void;
}) {
  const options = presets();
  const active = options.find((o) => o.range.from === range.from && o.range.to === range.to)?.key ?? "custom";
  const totals = journeys ? funnel(journeys) : null;
  const agents = agentJourneys ? byAgent(agentJourneys, users) : [];
  const pickedName = selectedAgent ? users.find((u) => u.id === selectedAgent)?.full_name ?? "Agent" : null;

  const input =
    "h-[30px] rounded-[4px] border border-line-strong bg-white px-[8px] font-sans text-[13px] text-ink outline-none focus:border-[#00a0a0]";

  return (
    <div className="mx-[20px] mb-[14px] rounded-[8px] border border-[#00a0a0]/35 bg-[#00a0a0]/[0.04] px-[14px] pb-[12px] pt-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-[8px]">
        <p className="m-0 flex items-center gap-[8px] font-sans text-[13px] font-semibold text-ink">
          Lead report
          <span className="rounded-[4px] bg-ink px-[5px] py-px font-sans text-[10.5px] font-medium uppercase tracking-[0.4px] text-white">
            Admin
          </span>
          <span className="font-normal text-ink-muted">by the day each lead came in</span>
        </p>
        <button
          type="button"
          onClick={onExport}
          disabled={!journeys || journeys.length === 0}
          className="flex h-[30px] items-center gap-[6px] rounded-[4px] bg-teal-deep px-[12px] font-sans text-[13px] text-white transition-colors hover:bg-[#006e87] disabled:opacity-40"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M8 2.5v8M4.8 7.5 8 10.7l3.2-3.2M3 13.5h10" />
          </svg>
          Export report (Excel)
        </button>
      </div>

      {/* the window */}
      <div className="mt-[10px] flex flex-wrap items-center gap-[6px]">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onRange(o.range)}
            className={`h-[28px] rounded-[14px] border px-[10px] font-sans text-[12.5px] transition-colors ${
              active === o.key
                ? "border-[#00a0a0] bg-[#00a0a0]/12 text-ink"
                : "border-line bg-white text-ink hover:bg-[var(--hover-ghost)]"
            }`}
          >
            {o.label}
          </button>
        ))}
        <span className="flex flex-wrap items-center gap-[6px] font-sans text-[12.5px] text-ink-muted sm:ml-[6px]">
          From
          <input
            type="date"
            value={range.from ?? ""}
            max={range.to ?? undefined}
            onChange={(e) => onRange({ ...range, from: e.target.value || null })}
            className={input}
            aria-label="From day"
          />
          to
          <input
            type="date"
            value={range.to ?? ""}
            min={range.from ?? undefined}
            onChange={(e) => onRange({ ...range, to: e.target.value || null })}
            className={input}
            aria-label="To day"
          />
        </span>
      </div>

      {pickedName && (
        <div className="mt-[8px] flex flex-wrap items-center gap-[8px]">
          <span className="flex h-[28px] items-center gap-[6px] rounded-[14px] border border-teal-deep bg-teal-deep px-[10px] font-sans text-[12.5px] text-white">
            Only leads entered by {pickedName}
            <button
              type="button"
              onClick={() => onAgent(null)}
              aria-label="Show every agent again"
              className="flex size-[16px] items-center justify-center rounded-full text-[11px] text-white/80 hover:bg-white/20 hover:text-white"
            >
              ✕
            </button>
          </span>
          <span className="font-sans text-[12px] text-ink-muted">
            The board, the numbers and the Excel file now hold just these leads, every field of each.
          </span>
        </div>
      )}

      {loadError ? (
        <p className="m-0 pt-[10px] font-sans text-[12.5px] text-alert">{loadError}</p>
      ) : !totals ? (
        <p className="m-0 pt-[10px] font-sans text-[12.5px] text-ink-muted">Following each lead to its contact and offers…</p>
      ) : (
        <>
          {/* the funnel */}
          <div className="mt-[10px] grid grid-cols-2 gap-[6px] sm:grid-cols-3 lg:grid-cols-5">
            {JOURNEY_STEPS.map((step) => (
              <div key={step.key} className="rounded-[6px] border border-line bg-white px-[10px] py-[7px]">
                <p className="m-0 flex items-center gap-[6px] font-sans text-[11.5px] text-ink-muted">
                  <span className="size-[7px] shrink-0 rounded-full" style={{ backgroundColor: step.color }} aria-hidden />
                  {step.label}
                </p>
                <p className="m-0 pt-[2px] font-display text-[19px] font-medium leading-[24px] tabular-nums text-ink">
                  {totals[step.key]}
                  {step.key !== "lead" && (
                    <span className="pl-[5px] font-sans text-[11.5px] font-normal text-ink-muted">
                      {pct(totals[step.key], totals.lead)}%
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>

          {/* one line per agent — click one to narrow everything to their leads */}
          {agents.length > 0 && !pickedName && (
            <p className="m-0 pt-[8px] font-sans text-[12px] text-ink-muted">
              Click an agent to see only the leads they entered, and export every field of each.
            </p>
          )}
          {agents.length > 0 && (
            <div className="thin-scroll mt-[8px] max-h-[176px] overflow-auto rounded-[6px] border border-line bg-white">
              <table className="w-full min-w-[640px] border-collapse font-sans text-[12.5px]">
                <thead className="sticky top-0 bg-canvas">
                  <tr className="text-left text-ink-muted">
                    <th className="px-[10px] py-[5px] font-medium">Agent (entered the lead)</th>
                    {JOURNEY_STEPS.map((s) => (
                      <th key={s.key} className="px-[8px] py-[5px] text-right font-medium">
                        {s.key === "lead" ? "Leads" : s.label}
                      </th>
                    ))}
                    <th className="px-[10px] py-[5px] text-right font-medium">Lead → deal</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((a) => {
                    const picked = selectedAgent != null && a.agentId === selectedAgent;
                    return (
                    <tr
                      key={a.agentId ?? a.agent}
                      onClick={() => a.agentId && onAgent(picked ? null : a.agentId)}
                      title={picked ? "Show every agent again" : `Only ${a.agent}'s leads: on the board, in the numbers and in the Excel file`}
                      className={`cursor-pointer border-t border-line transition-colors ${
                        picked ? "bg-[#00a0a0]/12" : "hover:bg-[var(--hover-ghost)]"
                      }`}
                    >
                      <td className="max-w-[220px] truncate px-[10px] py-[5px] text-ink">
                        <span className="flex items-center gap-[6px]">
                          <span
                            className={`flex size-[14px] shrink-0 items-center justify-center rounded-full border ${
                              picked ? "border-teal-deep bg-teal-deep" : "border-line-strong bg-white"
                            }`}
                            aria-hidden
                          >
                            {picked && <span className="size-[6px] rounded-full bg-white" />}
                          </span>
                          <span className={`truncate ${picked ? "font-medium" : ""}`}>{a.agent}</span>
                        </span>
                      </td>
                      {JOURNEY_STEPS.map((s) => (
                        <td key={s.key} className="px-[8px] py-[5px] text-right tabular-nums text-ink">
                          {a.counts[s.key] || <span className="text-ink-muted">0</span>}
                        </td>
                      ))}
                      <td className="px-[10px] py-[5px] text-right tabular-nums text-ink">{pct(a.counts.deal, a.counts.lead)}%</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
