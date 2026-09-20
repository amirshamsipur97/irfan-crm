"use client";

import { TimeCell } from "@/components/crm/activities/activity-cells";
import {
  toLocalDateString,
  toLocalDateTimeString,
} from "@/components/crm/activities/activities-config";
import { followUpTone, isLate } from "./followup-status";
import { shortDateTime } from "@/components/crm/leads/board-config";

function status(value: string | null): { label: string; className: string } | null {
  // one rule for the badge, the board cell and the To-do list
  const tone = followUpTone(value);
  if (!tone) return null;
  if (tone === "overdue") return { label: "Overdue", className: "bg-[#e2445c]/12 text-[#c23b53]" };
  if (tone === "today")
    return {
      label: isLate(value) ? "Today, past its time" : "Today",
      className: "bg-[#fdab3d]/20 text-[#b97416]",
    };
  return { label: "Scheduled", className: "bg-[#579bfc]/15 text-[#2d6fd1]" };
}

/**
 * The client's "next follow up", set from the drawer. It IS the board column
 * (same value, same save path as the cell), so the table, the Lead history
 * reminder and the Reminders page all follow it, and the owner is notified
 * when it comes due.
 */
export function FollowUpField({
  value,
  onSet,
}: {
  value: string | null;
  onSet: (next: string | null) => void;
}) {
  const badge = status(value);
  return (
    <div className="mt-[16px] rounded-[10px] border border-line bg-canvas/40 px-[12px] py-[10px]">
      <div className="flex items-center justify-between gap-[8px]">
        <span className="flex items-center gap-[8px]">
          <span className="font-display text-[14px] font-semibold leading-[20px] text-ink">Next follow up</span>
          {badge && (
            <span className={`rounded-[10px] px-[8px] py-[1px] font-sans text-[11.5px] leading-[16px] ${badge.className}`}>
              {badge.label}
            </span>
          )}
        </span>
        {value && (
          <button
            type="button"
            onClick={() => onSet(null)}
            className="rounded-[4px] px-[6px] font-sans text-[12px] leading-[20px] text-ink-muted transition-colors hover:bg-[var(--hover-ghost)] hover:text-ink"
          >
            Clear
          </button>
        )}
      </div>
      <div className="mt-[8px] flex items-center gap-[10px]">
        <span className="block h-[34px] w-[200px] shrink-0 overflow-hidden rounded-[4px] border border-line-strong bg-white">
          <TimeCell
            value={value}
            label="Next follow up"
            format={(v) => (v ? shortDateTime(v) : "Set date & time")}
            onChange={(iso, { hasTime }) => onSet(hasTime ? toLocalDateTimeString(iso) : toLocalDateString(iso))}
          />
        </span>
        <span className="font-sans text-[12px] leading-[16px] text-ink-muted">
          Same as the table column and the Lead history reminder. The owner is notified when it is due.
        </span>
      </div>
    </div>
  );
}
