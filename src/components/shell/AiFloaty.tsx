"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Icon } from "@/components/ui/Icon";
import { canAnimate } from "@/lib/motion";

/** Floating AI assistant button (bottom-right) with hover label, per design "Component 20". */
/**
 * AI Sidekick launcher — REMOVED from the product for handover (no backing
 * feature yet). Kept as a null component so board renders stay untouched;
 * restore from git history when Sidekick becomes real.
 */
export function AiFloaty() {
  return null;
}

// kept for when the AI Sidekick becomes real — see HANDOFF.md
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function AiFloatyDisabled() {
  const rootRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP(
    () => {
      if (!canAnimate()) return;
      gsap.from(".floaty-btn", {
        scale: 0.6,
        opacity: 0,
        duration: 0.45,
        delay: 0.4,
        ease: "back.out(1.8)",
        clearProps: "all",
      });
    },
    { scope: rootRef }
  );

  const show = contextSafe(() => {
    gsap.to(labelRef.current, { opacity: 1, x: 0, duration: 0.25, ease: "power2.out" });
  });
  const hide = contextSafe(() => {
    gsap.to(labelRef.current, { opacity: 0, x: 8, duration: 0.2, ease: "power2.in" });
  });

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute bottom-[24px] right-[32px] z-40 flex items-center"
    >
      <div
        ref={labelRef}
        className="pointer-events-none mr-[8px] flex translate-x-[8px] items-center rounded-[16px] border-2 border-white bg-[rgba(255,255,255,0.92)] px-[18px] py-[4px] opacity-0 shadow-[0px_6px_20px_0px_rgba(0,0,0,0.2)] backdrop-blur-[9.5px]"
      >
        <span className="font-sans text-[14px] font-semibold leading-[20px] text-ink">
          AI Sidekick
        </span>
        <span className="flex items-center gap-[4px] pl-[16px]">
          <kbd className="flex size-[16px] min-w-[16px] items-center justify-center rounded-[4px] border border-line-strong text-[10px] leading-[10px] text-ink-muted">
            ⌘
          </kbd>
          <kbd className="flex size-[16px] min-w-[16px] items-center justify-center rounded-[4px] border border-line-strong font-sans text-[10px] leading-[10px] text-ink-muted">
            /
          </kbd>
        </span>
      </div>
      <button
        type="button"
        aria-label="AI Sidekick"
        onMouseEnter={show}
        onMouseLeave={hide}
        className="floaty-btn pointer-events-auto flex h-[56px] min-w-[56px] max-w-[56px] items-center justify-center rounded-[16px] bg-white px-[12px] drop-shadow-[0px_4px_4px_rgba(0,0,0,0.2)] transition-transform duration-150 hover:scale-105"
      >
        <Icon name="floatySparkle" size={37} />
      </button>
    </div>
  );
}
