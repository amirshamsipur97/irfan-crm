"use client";

import { useEffect } from "react";

/** Monday-style green confirmation bar with optional Undo. */
export function SuccessToast({
  message,
  onUndo,
  onClose,
}: {
  message: string;
  onUndo?: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed left-1/2 top-[16px] z-[95] flex -translate-x-1/2 items-center gap-[14px] rounded-[8px] bg-[#258750] py-[10px] pl-[18px] pr-[12px] text-white shadow-[0px_8px_24px_rgba(0,0,0,0.3)]">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path
          d="M2.8 9.6l4 4L15.2 5"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="whitespace-nowrap font-sans text-[14px] leading-[20px]">{message}</span>
      {onUndo && (
        <button
          type="button"
          onClick={() => {
            onUndo();
            onClose();
          }}
          className="rounded-[6px] border border-white/70 px-[12px] py-[4px] font-sans text-[14px] leading-[20px] transition-colors hover:bg-white/10"
        >
          Undo
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        className="flex size-[26px] items-center justify-center rounded-[6px] transition-colors hover:bg-white/10"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M3 3l8 8M11 3l-8 8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
