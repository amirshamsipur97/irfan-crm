"use client";

import { CUSTOM_COL_W } from "@/lib/custom-columns";
import { followUpTone, isLate, type FollowUpTone } from "./followup-status";
import { shortDateTime } from "@/components/crm/leads/board-config";

const TONE: Record<FollowUpTone, { dot: string; text: string; label: string }> = {
  overdue: { dot: "#e2445c", text: "text-[#c23b53]", label: "Overdue" },
  today: { dot: "#fdab3d", text: "text-[#b97416]", label: "Today" },
  upcoming: { dot: "#579bfc", text: "text-ink", label: "Scheduled" },
};

/**
 * The "next follow up" cell as a button: it shows the follow up (with a
 * status dot) and opens the follow-up popup, where the time is set, the
 * client's details are at hand and the report is written.
 */
export function FollowUpButtonCell({ value, onOpen }: { value: string | null; onOpen: () => void }) {
  const tone = followUpTone(value);
  const look = tone ? TONE[tone] : null;
  const late = isLate(value);
  return (
    <span className="block border-b border-r border-line bg-white" style={{ width: CUSTOM_COL_W }}>
      <button
        type="button"
        onClick={onOpen}
        title={value ? `${look?.label ?? ""}${late ? " (its time has passed)" : ""} · open follow up` : "Set a follow up"}
        className="group/fu flex size-full items-center justify-center gap-[6px] px-[8px] transition-colors hover:bg-[var(--hover-ghost)]"
      >
        {value && look ? (
          <>
            <span className="size-[8px] shrink-0 rounded-full" style={{ backgroundColor: look.dot }} aria-hidden />
            <span className={`truncate font-sans text-[14px] leading-[20px] ${look.text}`}>{shortDateTime(value)}</span>
          </>
        ) : (
          <span className="flex items-center gap-[4px] font-sans text-[13px] leading-[20px] text-ink-muted opacity-0 transition-opacity group-hover/fu:opacity-100 focus-visible:opacity-100">
            <span aria-hidden className="text-[15px] leading-none">+</span> Follow up
          </span>
        )}
      </button>
    </span>
  );
}
