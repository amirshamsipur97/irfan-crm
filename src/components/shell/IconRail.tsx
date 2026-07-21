"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Icon } from "@/components/ui/Icon";
import type { IconName } from "@/lib/figma-icons";
import { canAnimate } from "@/lib/motion";

const ITEMS: { label: string; icon: IconName; href?: string }[] = [
  { label: "Home", icon: "railHome", href: "/" },
  { label: "CRM", icon: "railCrm", href: "/crm" },
];

export function IconRail() {
  const pathname = usePathname();
  const railRef = useRef<HTMLDivElement>(null);

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

  const isActive = (href?: string) =>
    href === "/" ? pathname === "/" : href ? pathname.startsWith(href) : false;

  return (
    <nav
      ref={railRef}
      className="relative flex w-[72px] shrink-0 flex-col items-center bg-canvas pb-[4px] pt-[8px] shadow-[inset_-5px_-20px_20px_0px_#e1eff2]"
    >
      <div className="flex w-[58px] flex-col items-center">
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          const inner = (
            <>
              <span
                className={`flex size-[32px] items-center justify-center rounded-[8px] transition-colors duration-150 ${
                  active
                    ? "bg-[var(--active-nav)]"
                    : "group-hover:bg-[var(--hover-ghost)]"
                }`}
              >
                <Icon name={item.icon} size={18} />
              </span>
              <span
                className={`max-w-[58px] overflow-hidden whitespace-nowrap text-center font-sans text-[11px] leading-[16px] tracking-[-0.33px] ${
                  active ? "text-ink" : "text-ink-muted"
                }`}
              >
                {item.label}
              </span>
            </>
          );
          const cls =
            "rail-item group flex w-full flex-col items-center gap-[4px] py-[6px]";
          return item.href ? (
            <Link key={item.label} href={item.href} className={cls}>
              {inner}
            </Link>
          ) : (
            <button key={item.label} type="button" className={cls} title={`${item.label} — coming soon`}>
              {inner}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
