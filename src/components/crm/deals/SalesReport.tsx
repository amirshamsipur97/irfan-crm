"use client";

import type { CrmDeal, CrmDealStage } from "@/lib/types";
import { FORECAST_CATEGORIES, forecastValue, money } from "./deals-config";

function KpiTile({ title, value, chip }: { title: string; value: string; chip?: string }) {
  return (
    <div className="flex min-h-[134px] flex-1 flex-col rounded-[8px] border border-line bg-white pb-[17px]">
      <div className="px-[24px] pb-[8px] pt-[20px]">
        <p className="font-sans text-[14px] font-semibold leading-[20px] text-ink">{title}</p>
      </div>
      <div className="flex flex-1 flex-col justify-end gap-[4px] px-[24px]">
        <p className="font-display text-[32px] font-light leading-[40px] tracking-[-0.5px] text-ink">
          {value}
        </p>
        <div className="flex min-h-[24px] items-center">
          {chip && (
            <span className="flex h-[24px] items-center rounded-[4px] bg-cyan-tint px-[8px] font-sans text-[14px] leading-[20px] text-ink">
              {chip}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function BreakdownRow({
  label,
  color,
  value,
  total,
}: {
  label: string;
  color: string;
  value: number;
  total: number;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-[12px]">
      <span className="w-[110px] shrink-0 truncate font-sans text-[14px] leading-[20px] text-ink">
        {label}
      </span>
      <span className="h-[24px] flex-1 overflow-hidden rounded-[4px] bg-canvas">
        <span
          className="block h-full rounded-[4px] transition-[width] duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </span>
      <span className="w-[90px] shrink-0 text-right font-sans text-[14px] leading-[20px] text-ink-muted">
        {money(value)}
      </span>
    </div>
  );
}

/** "Sales report" view — live aggregates over the deals data. */
export function SalesReport({
  deals,
  stages,
}: {
  deals: CrmDeal[];
  stages: CrmDealStage[];
}) {
  const wonStages = new Set(stages.filter((s) => s.is_won).map((s) => s.id));
  const lostStages = new Set(stages.filter((s) => s.is_lost).map((s) => s.id));

  const active = deals.filter((d) => !wonStages.has(d.stage_id) && !lostStages.has(d.stage_id));
  const won = deals.filter((d) => wonStages.has(d.stage_id));
  const closed = deals.filter((d) => wonStages.has(d.stage_id) || lostStages.has(d.stage_id));

  const activeValue = active.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
  const weightedForecast = active.reduce(
    (s, d) => s + forecastValue(Number(d.deal_value), d.close_probability ?? 0),
    0
  );
  const wonValue = won.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
  const winRate = closed.length > 0 ? Math.round((won.length / closed.length) * 100) : 0;

  const stageTotal = deals.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
  const categoryTotal = active.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);

  return (
    <div className="thin-scroll min-h-0 flex-1 overflow-y-auto bg-white px-[40px] pb-[48px] pt-[8px]">
      <div className="flex max-w-[1040px] flex-col gap-[24px]">
        <div className="flex gap-[16px]">
          <KpiTile
            title="Active pipeline value"
            value={money(activeValue)}
            chip={`${active.length} open deal${active.length === 1 ? "" : "s"}`}
          />
          <KpiTile title="Weighted forecast" value={money(weightedForecast)} />
          <KpiTile
            title="Closed won"
            value={money(wonValue)}
            chip={`${won.length} deal${won.length === 1 ? "" : "s"}`}
          />
          <KpiTile title="Win rate" value={`${winRate}%`} />
        </div>

        <section className="rounded-[8px] border border-line bg-white p-[24px]">
          <h3 className="pb-[16px] font-display text-[18px] font-medium leading-[24px] tracking-[-0.1px] text-ink">
            Deal value by stage
          </h3>
          <div className="flex flex-col gap-[12px]">
            {stages.map((s) => (
              <BreakdownRow
                key={s.id}
                label={s.name}
                color={s.color}
                value={deals
                  .filter((d) => d.stage_id === s.id)
                  .reduce((sum, d) => sum + (Number(d.deal_value) || 0), 0)}
                total={stageTotal}
              />
            ))}
          </div>
        </section>

        <section className="rounded-[8px] border border-line bg-white p-[24px]">
          <h3 className="pb-[16px] font-display text-[18px] font-medium leading-[24px] tracking-[-0.1px] text-ink">
            Active deals by forecast category
          </h3>
          <div className="flex flex-col gap-[12px]">
            {FORECAST_CATEGORIES.map((c) => (
              <BreakdownRow
                key={c.key}
                label={c.label}
                color={c.color}
                value={active
                  .filter((d) => d.forecast_category === c.key)
                  .reduce((sum, d) => sum + (Number(d.deal_value) || 0), 0)}
                total={categoryTotal}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
