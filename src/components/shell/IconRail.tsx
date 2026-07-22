"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Icon } from "@/components/ui/Icon";
import { LinkSpinner } from "@/components/ui/LinkSpinner";
import type { IconName } from "@/lib/figma-icons";
import { canAnimate } from "@/lib/motion";
import { canViewFinance, isFullAccess } from "@/lib/permissions";
import type { CrmRole } from "@/lib/types";

const glyphProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 18 18",
  fill: "none",
  stroke: "#323338",
  strokeWidth: 1.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Rail-weight glyphs for the sections that moved out of the workspace sidebar. */
const GLYPHS: Record<string, React.ReactNode> = {
  emails: (
    <svg {...glyphProps} aria-hidden>
      <rect x="2" y="3.8" width="14" height="10.4" rx="1.6" />
      <path d="M2.6 4.6L9 9.6l6.4-5" />
    </svg>
  ),
  finance: (
    <svg {...glyphProps} aria-hidden>
      <path d="M2.5 15.5h13" />
      <path d="M3.8 15.5V9.6M7.3 15.5V6.4M10.8 15.5V8.2M14.3 15.5V4.4" />
    </svg>
  ),
  team: (
    <svg {...glyphProps} aria-hidden>
      <circle cx="6.4" cy="6.2" r="2.4" />
      <path d="M1.8 15.2c.8-2.3 2.6-3.5 4.6-3.5s3.8 1.2 4.6 3.5" />
      <circle cx="12.8" cy="7" r="1.9" />
      <path d="M12 11.1c1.9.1 3.3 1.1 4.1 3" />
    </svg>
  ),
};

interface RailItem {
  label: string;
  href: string;
  icon?: IconName;
  glyph?: React.ReactNode;
}

export function IconRail({ role }: { role?: CrmRole }) {
  const pathname = usePathname();
  const railRef = useRef<HTMLDivElement>(null);

  const items: RailItem[] = [
    { label: "Home", icon: "railHome", href: "/" },
    { label: "CRM", icon: "railCrm", href: "/crm" },
    { label: "Emails", glyph: GLYPHS.emails, href: "/crm/emails" },
    ...(role && canViewFinance(role)
      ? [{ label: "Finance", glyph: GLYPHS.finance, href: "/crm/finance" }]
      : []),
    ...(role && isFullAccess(role)
      ? [{ label: "Team", glyph: GLYPHS.team, href: "/crm/team" }]
      : []),
  ];

  useGSAP(
    () => {
      if (!canAnimate()) return;
      gsap.from(".rail-item", {
        opacity: 0,
        y: 8,
        duration: 0.35,
        stagger: 0.04,
        ease: "power2.out",
        clearProps: "all",
      });
    },
    { scope: railRef }
  );

  // only the LONGEST matching href lights up (CRM must not stay active on /crm/emails)
  const bestMatch = items
    .filter((i) => (i.href === "/" ? pathname === "/" : pathname.startsWith(i.href)))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <nav
      ref={railRef}
      className="relative flex w-[72px] shrink-0 flex-col items-center bg-canvas pb-[4px] pt-[8px] shadow-[inset_-5px_-20px_20px_0px_#e1eff2]"
    >
      <div className="flex w-[58px] flex-col items-center">
        {items.map((item) => {
          const active = bestMatch?.href === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className="rail-item group relative flex w-full flex-col items-center gap-[4px] py-[6px]"
            >
              <span
                className={`flex size-[32px] items-center justify-center rounded-[8px] transition-colors duration-150 ${
                  active ? "bg-[var(--active-nav)]" : "group-hover:bg-[var(--hover-ghost)]"
                }`}
              >
                {item.icon ? <Icon name={item.icon} size={18} /> : item.glyph}
              </span>
              <span
                className={`max-w-[58px] overflow-hidden whitespace-nowrap text-center font-sans text-[11px] leading-[16px] tracking-[-0.33px] ${
                  active ? "text-ink" : "text-ink-muted"
                }`}
              >
                {item.label}
              </span>
              <LinkSpinner className="absolute right-[6px] top-[4px]" />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
