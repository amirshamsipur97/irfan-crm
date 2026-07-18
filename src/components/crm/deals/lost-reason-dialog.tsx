"use client";

import { useState } from "react";

/** Phase-1 rule: a deal cannot enter the Lost stage without a lost reason. */
export function LostReasonDialog({
  dealName,
  onSubmit,
  onCancel,
}: {
  dealName: string;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/30">
      <div className="w-[420px] rounded-[8px] bg-white p-[24px] shadow-[0px_15px_50px_rgba(0,0,0,0.3)]">
        <h3 className="m-0 font-display text-[18px] font-medium leading-[24px] text-ink">
          Mark “{dealName}” as Lost
        </h3>
        <p className="mb-[12px] mt-[6px] font-sans text-[13px] leading-[18px] text-ink-muted">
          A lost reason is required — it feeds the Lost Reasons report.
        </p>
        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. price, financing declined, chose another project…"
          className="h-[88px] w-full resize-none rounded-[4px] border border-line-strong p-[10px] font-sans text-[14px] leading-[20px] text-ink outline-none focus:border-teal-deep"
        />
        <div className="mt-[14px] flex justify-end gap-[8px]">
          <button
            type="button"
            onClick={onCancel}
            className="h-[32px] rounded-[4px] px-[12px] font-sans text-[14px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!reason.trim()}
            onClick={() => onSubmit(reason.trim())}
            className="h-[32px] rounded-[4px] bg-teal-deep px-[14px] font-sans text-[14px] text-white transition-opacity disabled:opacity-40"
          >
            Mark as Lost
          </button>
        </div>
      </div>
    </div>
  );
}
