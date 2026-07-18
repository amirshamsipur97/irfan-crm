"use client";

import { useState } from "react";
import { Popover } from "@/components/crm/leads/cells";
import { rangeLabel } from "./projects-config";

/** Timeline cell — Monday-style range pill colored by group, popover with start/end pickers. */
export function TimelineRangeCell({
  start,
  end,
  color,
  onSave,
}: {
  start: string | null;
  end: string | null;
  color: string;
  onSave: (start: string | null, end: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = rangeLabel(start, end);

  return (
    <div className="relative flex size-full items-center justify-center px-[8px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-[24px] max-w-full items-center justify-center rounded-[12px] px-[12px] transition-opacity hover:opacity-90"
        style={{ backgroundColor: label ? color : "#c4c4c4" }}
        title={label || "Set timeline"}
      >
        <span className="truncate font-sans text-[13px] leading-[18px] text-white">
          {label || "Set dates"}
        </span>
      </button>
      <Popover open={open} onClose={() => setOpen(false)} className="w-[220px]">
        <div className="flex flex-col gap-[8px] p-[4px]">
          <label className="flex flex-col gap-[2px] font-sans text-[12px] text-ink-muted">
            Start
            <input
              type="date"
              value={start ?? ""}
              onChange={(e) => onSave(e.target.value || null, end)}
              className="h-[28px] rounded-[4px] border border-line-strong px-[6px] font-sans text-[14px] text-ink outline-none focus:border-teal-deep"
            />
          </label>
          <label className="flex flex-col gap-[2px] font-sans text-[12px] text-ink-muted">
            End
            <input
              type="date"
              value={end ?? ""}
              onChange={(e) => onSave(start, e.target.value || null)}
              className="h-[28px] rounded-[4px] border border-line-strong px-[6px] font-sans text-[14px] text-ink outline-none focus:border-teal-deep"
            />
          </label>
        </div>
      </Popover>
    </div>
  );
}
