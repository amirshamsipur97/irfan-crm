"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import type { IconName } from "@/lib/figma-icons";
import { canAnimate } from "@/lib/motion";

export const WORKSPACE_NAV: { label: string; icon: IconName; href: string }[] = [
  { label: "Workspace home", icon: "navHome", href: "/crm" },
  { label: "Contacts", icon: "navContacts", href: "/crm/contacts" },
  { label: "Deals", icon: "navDeals", href: "/crm/deals" },
  { label: "Leads", icon: "navLeads", href: "/crm/leads" },
  { label: "Accounts", icon: "navAccounts", href: "/crm/accounts" },
  { label: "Client Projects", icon: "navProjects", href: "/crm/projects" },
  { label: "Products & Services", icon: "navProducts", href: "/crm/products" },
  { label: "Developments", icon: "navProjects", href: "/crm/developments" },
  { label: "Units", icon: "navAccounts", href: "/crm/units" },
  { label: "Viewings", icon: "navActivities", href: "/crm/viewings" },
  { label: "Activities", icon: "navActivities", href: "/crm/activities" },
  { label: "Sales Dashboard", icon: "navDashboard", href: "/crm/dashboard" },
];

const SYNC_ITEMS: { label: string; icon: IconName; count: number }[] = [
  { label: "Contacts", icon: "navContacts", count: 2 },
  { label: "Companies", icon: "navAccounts", count: 1 },
  { label: "Activities", icon: "syncActivities", count: 5 },
];

export function WorkspaceSidebar() {
  const pathname = usePathname();
  const rootRef = useRef<HTMLElement>(null);
  const syncRef = useRef<HTMLDivElement>(null);
  const [syncGone, setSyncGone] = useState(false);
  const { contextSafe } = useGSAP(
    () => {
      if (!canAnimate()) return;
      gsap.from(".ws-nav-item", {
        opacity: 0,
        x: -10,
        duration: 0.3,
        stagger: 0.03,
        ease: "power2.out",
        clearProps: "all",
      });
    },
    { scope: rootRef }
  );

  const closeSync = contextSafe(() => {
    gsap.to(syncRef.current, {
      height: 0,
      opacity: 0,
      duration: 0.35,
      ease: "power2.inOut",
      onComplete: () => setSyncGone(true),
    });
  });

  return (
    <aside
      ref={rootRef}
      className="flex w-[279px] shrink-0 flex-col justify-between overflow-hidden rounded-tl-[16px] border-l border-t border-line-soft bg-white"
    >
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto">
        {/* header */}
        <div className="flex items-center justify-between py-[16px] pl-[18px] pr-[16px]">
          <p className="font-sans text-[14px] font-semibold leading-[20px] text-ink">Workspace</p>
          <div className="flex items-center gap-[4px]">
            <IconButton icon="wsDots" size={32} label="Workspace options" />
            <IconButton icon="wsSearch" size={32} label="Search" />
            <IconButton icon="wsCollapse" size={32} label="Collapse" />
          </div>
        </div>

        {/* workspace switcher */}
        <div className="flex items-center gap-[8px] px-[16px] pb-[16px] pt-[6px]">
          <button
            type="button"
            className="flex h-[40px] flex-1 items-center gap-[8px] rounded-[4px] border border-line-strong px-[8px] transition-colors hover:bg-[var(--hover-ghost)]"
          >
            <span className="relative flex size-[24px] items-center justify-center rounded-[6px] bg-azure font-sans text-[13px] font-medium text-white">
              C
              <Icon
                name="hdrHomeBadge"
                size={12}
                className="absolute -bottom-[3px] -right-[3px]"
              />
            </span>
            <span className="font-sans text-[14px] leading-[20px] text-ink">CRM</span>
            <span className="ml-auto">
              <Icon name="wsChevron" size={16} />
            </span>
          </button>
          <IconButton icon="wsAdd" size={40} outlined label="Add workspace" />
        </div>

        {/* section rows */}
        <button
          type="button"
          className="ws-nav-item mx-[16px] flex h-[32px] w-[236px] items-center gap-[8px] rounded-[4px] px-[6px] transition-colors hover:bg-[var(--hover-ghost)]"
        >
          <span className="font-sans text-[14px] font-medium leading-[20px] text-ink">
            My workspace agents
          </span>
          <Icon name="wsAgentsChevron" size={16} />
        </button>
        <button
          type="button"
          className="ws-nav-item mx-[16px] mt-[12px] flex h-[32px] w-[236px] items-center gap-[8px] rounded-[4px] px-[6px] transition-colors hover:bg-[var(--hover-ghost)]"
        >
          <span className="font-sans text-[14px] font-medium leading-[20px] text-ink">Content</span>
          <Icon name="wsContentChevron" size={16} />
        </button>

        {/* board list */}
        <nav className="mt-[4px] flex flex-col">
          {WORKSPACE_NAV.map((item) => {
            const active =
              item.href === "/crm" ? pathname === "/crm" : pathname.startsWith(item.href);
            return (
              <div key={item.label} className="ws-nav-item px-[16px] pb-[4px]">
                <Link
                  href={item.href}
                  className={`flex h-[32px] items-center gap-[8px] rounded-[4px] py-[4px] pl-[6px] pr-[8px] transition-colors duration-150 ${
                    active ? "bg-[var(--active-nav)]" : "hover:bg-[var(--hover-ghost)]"
                  }`}
                >
                  <Icon name={item.icon} size={16} />
                  <span className="truncate font-sans text-[14px] leading-[20px] text-ink">
                    {item.label}
                  </span>
                </Link>
              </div>
            );
          })}
        </nav>
      </div>

      {/* sync completed panel */}
      {!syncGone && (
        <div ref={syncRef} className="shrink-0 overflow-hidden">
          <div className="border-t border-line bg-gradient-to-b from-cyan-soft to-white px-[12px] pb-[12px] pt-[13px] backdrop-blur-[20px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-[8px]">
                <Icon name="syncCheck" size={20} />
                <p className="font-sans text-[14px] font-semibold leading-[22px] text-ink">
                  Sync completed
                </p>
              </div>
              <div className="flex items-center">
                <IconButton icon="syncChevron" size={24} iconSize={10} label="Collapse" />
                <IconButton icon="syncClose" size={24} iconSize={20} label="Dismiss" onClick={closeSync} />
              </div>
            </div>
            <p className="pt-[12px] font-sans text-[12px] leading-[16px] text-ink-muted">
              Here are the items that were imported.
            </p>
            <div className="mt-[8px] flex flex-col gap-[8px]">
              {SYNC_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="flex h-[36px] items-center justify-between rounded-[4px] bg-[rgba(255,255,255,0.4)] px-[12px] shadow-[0_0_0_1px_rgba(208,212,228,0.5)]"
                >
                  <span className="flex items-center gap-[8px]">
                    <Icon name={item.icon} size={16} />
                    <span className="font-sans text-[12px] leading-[16px] text-ink">
                      {item.label}
                    </span>
                  </span>
                  <span className="font-sans text-[14px] leading-[20px] text-ink">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
