"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
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
  { label: "Developments", icon: "navProjects", href: "/crm/developments" },
  { label: "Units", icon: "navAccounts", href: "/crm/units" },
  { label: "Viewings", icon: "navActivities", href: "/crm/viewings" },
  { label: "Activities", icon: "navActivities", href: "/crm/activities" },
  { label: "Sales Dashboard", icon: "navDashboard", href: "/crm/dashboard" },
];

/** Finance board is only listed for admin/finance roles. */
const FINANCE_NAV = { label: "Finance", icon: "navDashboard" as IconName, href: "/crm/finance" };

export function WorkspaceSidebar({ role }: { role?: string }) {
  const pathname = usePathname();
  const nav = role === "admin" || role === "finance" ? [...WORKSPACE_NAV, FINANCE_NAV] : WORKSPACE_NAV;
  const rootRef = useRef<HTMLElement>(null);
  useGSAP(
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
          <span className="font-sans text-[14px] font-medium leading-[20px] text-ink">Content</span>
          <Icon name="wsContentChevron" size={16} />
        </button>

        {/* board list */}
        <nav className="mt-[4px] flex flex-col">
          {nav.map((item) => {
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

    </aside>
  );
}
