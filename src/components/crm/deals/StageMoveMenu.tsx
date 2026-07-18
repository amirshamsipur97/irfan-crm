"use client";

import { useState } from "react";
import { Popover } from "@/components/crm/leads/cells";
import type { CrmDealStage } from "@/lib/types";

/** Small "move to stage" menu used on pipeline cards. */
export function StageMoveMenu({
  stages,
  currentStageId,
  onSelect,
}: {
  stages: CrmDealStage[];
  currentStageId: string;
  onSelect: (stageId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Move to stage"
        onClick={() => setOpen((v) => !v)}
        className="flex size-[24px] items-center justify-center rounded-[4px] text-ink-muted transition-colors hover:bg-[var(--hover-ghost)]"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
          <circle cx="3.2" cy="8" r="1.4" fill="currentColor" />
          <circle cx="8" cy="8" r="1.4" fill="currentColor" />
          <circle cx="12.8" cy="8" r="1.4" fill="currentColor" />
        </svg>
      </button>
      <Popover open={open} onClose={() => setOpen(false)} className="left-auto right-0 w-[170px] translate-x-0">
        <div className="flex flex-col gap-[4px]">
          {stages
            .filter((s) => s.id !== currentStageId)
            .map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onSelect(s.id);
                  setOpen(false);
                }}
                className="flex h-[30px] items-center gap-[8px] rounded-[4px] px-[8px] text-left font-sans text-[14px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
              >
                <span className="size-[10px] rounded-[3px]" style={{ backgroundColor: s.color }} />
                {s.name}
              </button>
            ))}
        </div>
      </Popover>
    </div>
  );
}
