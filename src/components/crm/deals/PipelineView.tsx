"use client";

import { Avatar } from "@/components/ui/Avatar";
import type { CrmDeal, CrmDealStage, CrmUser } from "@/lib/types";
import { categoryMeta, money } from "./deals-config";
import { StageMoveMenu } from "./StageMoveMenu";

/** "Pipeline" view — kanban columns per deal stage. */
export function PipelineView({
  deals,
  stages,
  users,
  onStageChange,
}: {
  deals: CrmDeal[];
  stages: CrmDealStage[];
  users: CrmUser[];
  onStageChange: (dealId: string, stageId: string) => void;
}) {
  const userById = new Map(users.map((u) => [u.id, u]));

  return (
    <div className="thin-scroll min-h-0 flex-1 overflow-x-auto bg-white px-[40px] pb-[24px] pt-[8px]">
      <div className="flex h-full gap-[12px]">
        {stages.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage_id === stage.id);
          const total = stageDeals.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
          return (
            <div key={stage.id} className="flex h-full w-[240px] shrink-0 flex-col">
              <div
                className="flex h-[40px] items-center justify-between rounded-t-[8px] px-[12px] text-white"
                style={{ backgroundColor: stage.color }}
              >
                <span className="truncate font-sans text-[14px] font-semibold leading-[20px]">
                  {stage.name}
                </span>
                <span className="font-sans text-[13px] leading-[20px] opacity-90">
                  {stageDeals.length} · {money(total)}
                </span>
              </div>
              <div className="thin-scroll flex min-h-0 flex-1 flex-col gap-[8px] overflow-y-auto rounded-b-[8px] bg-canvas p-[8px]">
                {stageDeals.map((deal) => {
                  const owner = deal.owner_id ? userById.get(deal.owner_id) : undefined;
                  const cat = categoryMeta(deal.forecast_category);
                  return (
                    <div
                      key={deal.id}
                      className="flex flex-col gap-[8px] rounded-[8px] border border-line bg-white p-[12px] transition-shadow hover:shadow-[0px_6px_20px_rgba(0,0,0,0.1)]"
                    >
                      <div className="flex items-start justify-between gap-[8px]">
                        <p className="min-w-0 truncate font-sans text-[14px] font-semibold leading-[20px] text-ink">
                          {deal.name}
                        </p>
                        <StageMoveMenu
                          stages={stages}
                          currentStageId={deal.stage_id}
                          onSelect={(stageId) => onStageChange(deal.id, stageId)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-sans text-[14px] leading-[20px] text-ink-muted">
                          {deal.deal_value != null ? money(Number(deal.deal_value)) : "—"}
                        </span>
                        {owner && (
                          <Avatar
                            name={owner.full_name || owner.email}
                            src={owner.avatar_url}
                            size={22}
                          />
                        )}
                      </div>
                      {cat && (
                        <span
                          className="w-fit rounded-[4px] px-[8px] py-[2px] font-sans text-[12px] leading-[16px] text-white"
                          style={{ backgroundColor: cat.color }}
                        >
                          {cat.label}
                        </span>
                      )}
                    </div>
                  );
                })}
                {stageDeals.length === 0 && (
                  <p className="pt-[12px] text-center font-sans text-[13px] leading-[18px] text-ink-muted">
                    No deals
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
