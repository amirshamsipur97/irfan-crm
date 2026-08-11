"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Small dark tooltip on hover.
 *
 * The native `title` attribute took a second or more to appear and rendered
 * as an OS box nobody styled. This shows a real chip after a short beat.
 *
 * Two things it must keep doing:
 *  - the handlers live on the WRAPPER, never on the child. Owner cells are a
 *    disabled <button> for agents, and a disabled control fires no pointer
 *    events — hanging the tooltip off the child would hide it from exactly
 *    the people who cannot open the picker and rely on the tooltip most.
 *  - the tip is portalled to <body> and positioned fixed. Inside a cell it
 *    would be clipped by the board's scroller, like every other panel here.
 */
export function HoverTip({
  label,
  children,
  delay = 120,
}: {
  label: string;
  children: React.ReactNode;
  /** long enough not to flicker while the pointer crosses the row */
  delay?: number;
}) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shown, setShown] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  // stable identities: the scroll/resize effect below lists hide as a
  // dependency, and a fresh closure each render would re-subscribe endlessly
  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const hide = useCallback(() => {
    clear();
    setShown(false);
    setPos(null);
  }, [clear]);

  useEffect(() => () => clear(), [clear]);

  // a scrolling board would leave the tip floating where the cell used to be
  useEffect(() => {
    if (!shown) return;
    const onScroll = () => hide();
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [shown, hide]);

  // measure once mounted: centre under the anchor, flip above when short of
  // room, clamp to the viewport (0-viewport webviews fall back to raw maths)
  useEffect(() => {
    if (!shown) return;
    // measure the CHILD: the wrapper is display:contents so it generates no
    // box of its own and would hand back an all-zero rect
    const target = wrapRef.current?.firstElementChild ?? wrapRef.current;
    const anchor = target?.getBoundingClientRect();
    const tip = tipRef.current;
    if (!anchor || !tip) return;
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    let left = anchor.left + anchor.width / 2 - w / 2;
    if (vw) left = Math.max(8, Math.min(left, vw - w - 8));
    let top = anchor.bottom + 6;
    if (vh && top + h > vh) top = Math.max(8, anchor.top - h - 6);
    setPos({ left, top });
  }, [shown]);

  if (!label) return <>{children}</>;

  return (
    <>
      <span
        ref={wrapRef}
        className="contents"
        onPointerEnter={() => {
          clear();
          timer.current = setTimeout(() => setShown(true), delay);
        }}
        onPointerLeave={hide}
        onPointerDown={hide}
      >
        {children}
      </span>

      {shown &&
        createPortal(
          <span
            ref={tipRef}
            role="tooltip"
            className="pointer-events-none fixed z-[120] max-w-[260px] truncate rounded-[6px] bg-[#323338] px-[10px] py-[6px] font-sans text-[12.5px] font-medium leading-[17px] text-white shadow-[0px_6px_20px_rgba(0,0,0,0.28)]"
            style={
              pos
                ? { left: pos.left, top: pos.top, opacity: 1 }
                : { left: -9999, top: -9999, opacity: 0 }
            }
          >
            {label}
          </span>,
          document.body
        )}
    </>
  );
}
