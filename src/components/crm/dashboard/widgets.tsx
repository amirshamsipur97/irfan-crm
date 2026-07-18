"use client";

import { useMemo, useState } from "react";
import { money } from "@/components/crm/deals/deals-config";

export function compact(n: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/** Shared widget card frame (light design system). */
export function Widget({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`dash-widget flex flex-col rounded-[8px] border border-line bg-white ${className}`}
    >
      <header className="flex h-[48px] shrink-0 items-center justify-between border-b border-line-soft px-[16px]">
        <span className="flex items-center gap-[8px]">
          <h3 className="truncate font-display text-[16px] font-medium leading-[24px] tracking-[-0.1px] text-ink">
            {title}
          </h3>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M2 3h12l-4.6 5.2v4.1l-2.8-1.5V8.2L2 3z" stroke="#676879" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="font-sans text-[18px] leading-none text-ink-muted">⋯</span>
      </header>
      <div className="flex min-h-0 flex-1 flex-col p-[16px]">{children}</div>
    </section>
  );
}

/** Annual Target — semicircle gauge with needle (Monday-style). */
export function GaugeWidget({ actual, target }: { actual: number; target: number }) {
  const max = Math.max(target, actual, 1);
  const ratio = Math.min(actual / max, 1);
  const W = 380;
  const R = 110;
  const RING = 40;
  const CX = W / 2;
  const CY = 150;
  // point on the gauge at fraction t (0 = left end, 1 = right end) and radius r
  const pt = (t: number, r: number) => {
    const a = Math.PI * (1 - t);
    return [CX + r * Math.cos(a), CY - r * Math.sin(a)] as const;
  };
  // semicircle arc from fraction `from` to `to` — spans ≤180°, so large-arc is always 0
  const arc = (from: number, to: number, radius: number) => {
    const [x1, y1] = pt(from, radius);
    const [x2, y2] = pt(to, radius);
    return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`;
  };

  // kite-shaped needle pointing at the actual value
  const dirA = Math.PI * (1 - ratio);
  const dir = [Math.cos(dirA), -Math.sin(dirA)] as const;
  const perp = [-dir[1], dir[0]] as const;
  const tip = [CX + dir[0] * (R - RING / 2 - 12), CY + dir[1] * (R - RING / 2 - 12)];
  const needle = [
    tip,
    [CX + perp[0] * 6.5, CY + perp[1] * 6.5],
    [CX - dir[0] * 10, CY - dir[1] * 10],
    [CX - perp[0] * 6.5, CY - perp[1] * 6.5],
  ]
    .map((p) => p.map((v) => v.toFixed(1)).join(","))
    .join(" ");

  // small triangle marker just outside the ring at the actual position, pointing inward
  const markTip = pt(ratio, R + RING / 2 + 4);
  const markB1 = [
    CX + dir[0] * (R + RING / 2 + 16) + perp[0] * 6,
    CY + dir[1] * (R + RING / 2 + 16) + perp[1] * 6,
  ];
  const markB2 = [
    CX + dir[0] * (R + RING / 2 + 16) - perp[0] * 6,
    CY + dir[1] * (R + RING / 2 + 16) - perp[1] * 6,
  ];
  const marker = [markTip, markB1, markB2]
    .map((p) => p.map((v) => v.toFixed(1)).join(","))
    .join(" ");

  const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1];

  return (
    <div className="flex flex-1 flex-col items-center justify-between">
      <svg viewBox={`0 -26 ${W} 190`} className="w-full max-w-[400px]">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="100%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00c875" />
            <stop offset="55%" stopColor="#00a0a0" />
            <stop offset="100%" stopColor="#0086c0" />
          </linearGradient>
        </defs>
        <path d={arc(0, 1, R)} stroke="#e7e9ef" strokeWidth={RING} fill="none" strokeLinecap="butt" />
        <path
          d={arc(0, Math.max(ratio, 0.001), R)}
          stroke="url(#gaugeGrad)"
          strokeWidth={RING}
          fill="none"
          strokeLinecap="butt"
        />
        {ticks.map((t) => {
          // 0 / max sit beside the ring ends; the rest ring around the outside
          const side = t === 0 || t === 1;
          const [lx, ly] = pt(t, R + RING / 2 + (side ? 16 : 14));
          return (
            <text
              key={t}
              x={lx}
              y={ly + (side ? 4 : 0)}
              textAnchor={t === 0 ? "end" : t === 1 ? "start" : "middle"}
              className="fill-[#676879]"
              fontSize="12"
              fontFamily="var(--font-figtree)"
            >
              {Math.round(max * t)}
            </text>
          );
        })}
        <polygon points={marker} fill="#323338" />
        <polygon points={needle} fill="#323338" stroke="#323338" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <div className="flex w-full items-end justify-between px-[8px] pt-[8px]">
        <div>
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.5px] text-ink-muted">
            Actual
          </p>
          <p className="font-display text-[26px] font-semibold leading-[32px] text-ink">
            {compact(actual)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.5px] text-ink-muted">
            Target
          </p>
          <p className="font-display text-[26px] font-semibold leading-[32px] text-ink">
            {compact(target)}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Monthly Target — horizontal gradient scale bar. */
export function MonthlyTargetWidget({ actual, target }: { actual: number; target: number }) {
  const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1];
  return (
    <div className="flex flex-1 flex-col justify-between">
      <div className="pt-[32px]">
        <div className="h-[64px] w-full rounded-[4px] bg-gradient-to-r from-[#579bfc] via-[#7a6ff0] to-[#a25ddc]" />
        <div className="flex justify-between pt-[8px]">
          {ticks.map((t) => (
            <span key={t} className="font-sans text-[12px] leading-[16px] text-ink-muted">
              {Math.round(target * t).toLocaleString("en-US")}
            </span>
          ))}
        </div>
      </div>
      <div className="flex w-full items-end justify-between pt-[16px]">
        <div>
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.5px] text-ink-muted">
            Monthly actual
          </p>
          <p className="font-display text-[26px] font-semibold leading-[32px] text-ink">
            {compact(actual)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.5px] text-ink-muted">
            This month&apos;s target
          </p>
          <p className="font-display text-[26px] font-semibold leading-[32px] text-ink">
            {compact(target)}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Big single-number widget. */
export function StatWidget({ value }: { value: number }) {
  return (
    <div className="flex flex-1 items-center justify-center py-[16px]">
      <p className="font-display text-[36px] font-light leading-[44px] tracking-[-0.5px] text-ink">
        {money(Math.round(value))}
      </p>
    </div>
  );
}

/** Pie chart with side legend. */
export function PieWidget({
  segments,
}: {
  segments: { label: string; color: string; count: number }[];
}) {
  const total = segments.reduce((s, x) => s + x.count, 0) || 1;
  let acc = 0;
  const R = 90;
  const C = 100;
  const arcs = segments.map((s) => {
    const from = acc / total;
    acc += s.count;
    const to = acc / total;
    const a1 = 2 * Math.PI * from - Math.PI / 2;
    const a2 = 2 * Math.PI * to - Math.PI / 2;
    const x1 = C + R * Math.cos(a1);
    const y1 = C + R * Math.sin(a1);
    const x2 = C + R * Math.cos(a2);
    const y2 = C + R * Math.sin(a2);
    const large = to - from > 0.5 ? 1 : 0;
    return {
      ...s,
      pct: ((s.count / total) * 100).toFixed(1),
      d:
        to - from >= 0.999
          ? `M ${C} ${C - R} A ${R} ${R} 0 1 1 ${C - 0.01} ${C - R} Z`
          : `M ${C} ${C} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`,
    };
  });

  return (
    <div className="flex flex-1 items-center justify-center gap-[40px]">
      <svg viewBox="0 0 200 200" className="size-[220px] shrink-0">
        {arcs.map((a) => (
          <path key={a.label} d={a.d} fill={a.color} />
        ))}
      </svg>
      <div className="flex flex-col gap-[12px]">
        {arcs.map((a) => (
          <span key={a.label} className="flex items-center gap-[8px]">
            <span className="size-[12px] rounded-full" style={{ backgroundColor: a.color }} />
            <span className="font-sans text-[14px] leading-[20px] text-ink">
              {a.label}: {a.pct}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Vertical bar chart with y-gridlines, value labels and optional dashed goal line. */
export function BarsWidget({
  bars,
  goal,
  yLabel,
}: {
  bars: { label: string; value: number; color?: string }[];
  goal?: number;
  yLabel?: string;
}) {
  const max = Math.max(...bars.map((b) => b.value), goal ?? 0, 1);
  const niceMax = max * 1.15;
  const gridSteps = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="flex flex-1 gap-[8px] pt-[8px]">
      {yLabel && (
        <span className="self-center font-sans text-[12px] text-ink-muted [writing-mode:vertical-rl] [transform:rotate(180deg)]">
          {yLabel}
        </span>
      )}
      <div className="relative min-h-[220px] flex-1">
        {gridSteps.map((g) => (
          <div
            key={g}
            className="absolute inset-x-0 flex items-center gap-[8px]"
            style={{ bottom: `${24 + g * (100 - 34)}%` }}
          >
            <span className="w-[60px] shrink-0 text-right font-sans text-[12px] leading-[16px] text-ink-muted">
              {money(Math.round(niceMax * g))}
            </span>
            <span className="h-px flex-1 bg-line-soft" />
          </div>
        ))}
        {goal != null && (
          <div
            className="absolute left-[68px] right-0 z-10 border-t-2 border-dashed border-brand"
            style={{ bottom: `${24 + (goal / niceMax) * (100 - 34)}%` }}
          >
            <span className="absolute -top-[20px] left-[8px] font-sans text-[12px] text-ink-muted">
              Goal
            </span>
          </div>
        )}
        <div className="absolute inset-x-[68px] bottom-0 top-0 flex items-end justify-around gap-[24px] px-[16px]">
          {bars.map((b) => (
            <div key={b.label} className="flex h-full w-full max-w-[180px] flex-col items-center justify-end">
              <span className="pb-[4px] font-sans text-[14px] font-semibold leading-[20px] text-ink">
                {money(b.value)}
              </span>
              <div
                className="w-full rounded-t-[4px]"
                style={{
                  height: `${(b.value / niceMax) * (100 - 34)}%`,
                  minHeight: 4,
                  backgroundColor: b.color ?? "#579bfc",
                }}
              />
              <span className="pt-[8px] font-sans text-[13px] leading-[18px] text-ink-muted">
                {b.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Pipeline conversion funnel. */
export function FunnelWidget({
  steps,
  conversionToWon,
}: {
  steps: { label: string; count: number; color: string }[];
  conversionToWon: number;
}) {
  const max = Math.max(...steps.map((s) => s.count), 1);
  const W = 900;
  const H = 240;
  const barW = 46;
  const gap = steps.length > 1 ? (W - steps.length * barW) / (steps.length - 1) : 0;
  const barH = (c: number) => (c / max) * (H - 60);
  const x = (i: number) => i * (barW + gap);

  return (
    <div className="flex flex-1 items-stretch gap-[24px]">
      <div className="min-w-0 flex-1">
        <svg viewBox={`0 0 ${W} ${H + 30}`} className="w-full">
          {/* connectors */}
          {steps.slice(0, -1).map((s, i) => {
            const next = steps[i + 1];
            const y1 = H - barH(s.count);
            const y2 = H - barH(next.count);
            return (
              <polygon
                key={`c-${s.label}`}
                points={`${x(i) + barW},${y1} ${x(i + 1)},${y2} ${x(i + 1)},${H} ${x(i) + barW},${H}`}
                fill="#579bfc"
                opacity="0.15"
              />
            );
          })}
          {/* bars + labels */}
          {steps.map((s, i) => {
            const h = barH(s.count);
            return (
              <g key={s.label}>
                <rect
                  x={x(i)}
                  y={H - h}
                  width={barW}
                  height={h}
                  rx="6"
                  fill={s.color}
                />
                <text
                  x={x(i) + barW / 2}
                  y={H - h - 10}
                  textAnchor="middle"
                  fontSize="15"
                  fontWeight="600"
                  fontFamily="var(--font-figtree)"
                  className="fill-[#323338]"
                >
                  {s.count}
                </text>
                <text
                  x={x(i) + barW / 2}
                  y={H + 22}
                  textAnchor="middle"
                  fontSize="13"
                  fontFamily="var(--font-figtree)"
                  className="fill-[#676879]"
                >
                  {s.label}
                </text>
              </g>
            );
          })}
          {/* percentage pills between steps */}
          {steps.slice(1).map((s, i) => {
            const prev = steps[i];
            const pct = prev.count > 0 ? (s.count / prev.count) * 100 : 0;
            const label = `${pct % 1 === 0 ? pct : pct.toFixed(1)}%`;
            const px = x(i) + barW + gap / 2;
            const py = H - Math.max(barH(s.count), barH(prev.count)) / 1.15 - 8;
            return (
              <g key={`p-${s.label}`}>
                <rect x={px - 30} y={py - 14} width="60" height="24" rx="4" fill="#323338" />
                <text
                  x={px}
                  y={py + 2}
                  textAnchor="middle"
                  fontSize="12"
                  fontFamily="var(--font-figtree)"
                  fill="#ffffff"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex w-[150px] shrink-0 flex-col items-center justify-center border-l border-line-soft pl-[16px]">
        <p className="font-display text-[28px] font-semibold leading-[36px] text-brand">
          {conversionToWon} %
        </p>
        <p className="text-center font-sans text-[14px] leading-[20px] text-ink">
          Conversion to Won
        </p>
      </div>
    </div>
  );
}

const TYPE_COLORS: Record<string, string> = {
  email: "#579bfc",
  meeting: "#a25ddc",
  call_summary: "#fdab3d",
  note: "#00a0a0",
};
const TYPE_LABELS: Record<string, string> = {
  email: "Email",
  meeting: "Meeting",
  call_summary: "Call summary",
  note: "Note",
};

/** Activity tracker — stacked horizontal bars per member with 7D/30D toggle. */
export function ActivityTrackerWidget({
  events,
}: {
  events: { owner: string; type: string; at: string }[];
}) {
  const [range, setRange] = useState<7 | 30>(30);

  const { rows, max, typesPresent } = useMemo(() => {
    const cutoff = Date.now() - range * 86400000;
    const filtered = events.filter((e) => new Date(e.at).getTime() >= cutoff);
    const byOwner = new Map<string, Map<string, number>>();
    for (const e of filtered) {
      const m = byOwner.get(e.owner) ?? new Map<string, number>();
      m.set(e.type, (m.get(e.type) ?? 0) + 1);
      byOwner.set(e.owner, m);
    }
    const rows = [...byOwner.entries()].map(([owner, m]) => ({
      owner,
      segments: [...m.entries()].map(([type, count]) => ({ type, count })),
      total: [...m.values()].reduce((s, c) => s + c, 0),
    }));
    const max = Math.max(...rows.map((r) => r.total), 1);
    const typesPresent = [...new Set(filtered.map((e) => e.type))];
    return { rows, max, typesPresent };
  }, [events, range]);

  return (
    <div className="flex flex-1 flex-col gap-[16px]">
      <div className="flex items-center gap-[8px]">
        <button
          type="button"
          className="flex h-[32px] items-center gap-[6px] rounded-[4px] border border-line-strong px-[10px] font-sans text-[14px] text-ink"
        >
          Custom
        </button>
        <span className="flex overflow-hidden rounded-[4px] border border-line-strong">
          {([7, 30] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`h-[32px] px-[10px] font-sans text-[14px] transition-colors ${
                range === r ? "bg-teal-deep text-white" : "text-ink hover:bg-[var(--hover-ghost)]"
              }`}
            >
              {r}D
            </button>
          ))}
        </span>
        <span className="flex h-[32px] items-center rounded-[4px] border border-line-strong px-[10px] font-sans text-[14px] text-ink">
          Deals ⌄
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="py-[32px] text-center font-sans text-[14px] text-ink-muted">
          No activities in the selected range
        </p>
      ) : (
        <div className="flex flex-col gap-[16px]">
          {rows.map((row) => (
            <div key={row.owner} className="flex items-center gap-[16px]">
              <span className="w-[130px] shrink-0 truncate text-right font-sans text-[14px] leading-[20px] text-ink">
                {row.owner}
              </span>
              <div className="flex h-[56px] flex-1 items-stretch overflow-hidden rounded-[2px] bg-canvas">
                {row.segments.map((s) => (
                  <span
                    key={s.type}
                    style={{
                      width: `${(s.count / max) * 100}%`,
                      backgroundColor: TYPE_COLORS[s.type] ?? "#c4c4c4",
                    }}
                    title={`${TYPE_LABELS[s.type] ?? s.type}: ${s.count}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col items-center gap-[8px]">
        <span className="font-sans text-[13px] leading-[18px] text-ink-muted">Activities count</span>
        <span className="flex items-center gap-[16px]">
          {typesPresent.map((t) => (
            <span key={t} className="flex items-center gap-[6px]">
              <span className="size-[12px] rounded-[3px]" style={{ backgroundColor: TYPE_COLORS[t] ?? "#c4c4c4" }} />
              <span className="font-sans text-[13px] leading-[18px] text-ink">
                {TYPE_LABELS[t] ?? t}
              </span>
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
