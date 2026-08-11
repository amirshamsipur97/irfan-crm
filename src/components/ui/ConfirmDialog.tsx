"use client";

import { useState } from "react";

/** Small centered confirm for destructive actions (delete group etc.). */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/30">
      <div className="w-[400px] rounded-[8px] bg-white p-[24px] shadow-[0px_15px_50px_rgba(0,0,0,0.3)]">
        <h3 className="m-0 font-display text-[18px] font-medium leading-[24px] text-ink">
          {title}
        </h3>
        <p className="mb-0 mt-[6px] font-sans text-[13px] leading-[19px] text-ink-muted">
          {message}
        </p>
        <div className="mt-[18px] flex justify-end gap-[8px]">
          <button
            type="button"
            onClick={onCancel}
            className="h-[32px] rounded-[4px] px-[12px] font-sans text-[14px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-[32px] rounded-[4px] bg-alert px-[14px] font-sans text-[14px] text-white transition-opacity hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Pending-item state for a destructive action, so a ✕ next to a row can ask
 * before it fires. `ask(item)` opens, `close()` cancels; render the dialog
 * from `pending` and call the real action in onConfirm.
 */
export function useConfirm<T>() {
  const [pending, setPending] = useState<T | null>(null);
  return {
    pending,
    ask: (item: T) => setPending(item),
    close: () => setPending(null),
  };
}
