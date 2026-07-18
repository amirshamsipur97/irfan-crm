"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Icon } from "@/components/ui/Icon";
import { ICONS } from "@/lib/figma-icons";

// each logo = off-white circle + white ring + brand glyph, layered per the design
const AI_LOGOS: { glyph: string; size: number }[] = [
  { glyph: ICONS.aiLogo1, size: 18 },
  { glyph: ICONS.aiLogo2, size: 20 },
  { glyph: ICONS.aiLogo3, size: 16 },
  { glyph: ICONS.aiLogo4, size: 20 },
];

function BannerLogo({ glyph, size }: { glyph: string; size: number }) {
  return (
    <span className="relative flex size-[29px] items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ICONS.aiLogoRing} alt="" className="absolute inset-0 size-full" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ICONS.aiLogoRingInner} alt="" className="absolute inset-0 size-full" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={glyph} alt="" width={size} height={size} className="relative block" />
    </span>
  );
}

/** Dismissible cyan announcement strip above the top bar (workspace pages). */
export function AnnouncementBanner() {
  const [gone, setGone] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: wrapRef });

  const close = contextSafe(() => {
    gsap.to(wrapRef.current, {
      height: 0,
      opacity: 0,
      duration: 0.35,
      ease: "power2.inOut",
      onComplete: () => setGone(true),
    });
  });

  if (gone) return null;

  return (
    <div ref={wrapRef} className="h-[40px] shrink-0 overflow-hidden">
      <div className="relative flex h-[40px] w-full items-center justify-center bg-cyan-tint px-[48px]">
        <div className="flex items-center gap-[8px]">
          <div className="flex items-center">
            {AI_LOGOS.map((logo, i) => (
              <span
                key={logo.glyph}
                className="relative flex items-center"
                style={{ marginLeft: i === 0 ? 0 : -11, zIndex: 4 - i }}
              >
                <BannerLogo glyph={logo.glyph} size={logo.size} />
              </span>
            ))}
          </div>
          <p className="font-sans text-[14px] font-semibold leading-[20px] text-ink">
            Connect AI tool of your choice to help with your setup
          </p>
          <button
            type="button"
            className="cursor-pointer font-sans text-[15px] leading-[22.5px] text-link hover:underline"
          >
            Connect AI
          </button>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={close}
          className="absolute right-[12px] top-1/2 flex size-[32px] -translate-y-1/2 items-center justify-center rounded-[4px] transition-colors hover:bg-[rgba(50,51,56,0.1)]"
        >
          <Icon name="bannerClose" size={20} />
        </button>
      </div>
    </div>
  );
}
