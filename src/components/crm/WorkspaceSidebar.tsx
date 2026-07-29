"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Icon } from "@/components/ui/Icon";
import { LinkSpinner } from "@/components/ui/LinkSpinner";
import { IconButton } from "@/components/ui/IconButton";
import type { IconName } from "@/lib/figma-icons";
import { canAnimate } from "@/lib/motion";
import type { CrmRole } from "@/lib/types";

type NavItem = { label: string; icon: IconName; href: string };

/**
 * The everyday sales workflow — home, the pipeline in the order it is worked,
 * and the report that summarises it. Kept above a divider so the boards people
 * open all day are never mixed in with the reference and inventory boards.
 */
export const PRIMARY_NAV: NavItem[] = [
  { label: "Workspace home", icon: "navHome", href: "/crm" },
  { label: "Leads", icon: "navLeads", href: "/crm/leads" },
  { label: "Contacts", icon: "navContacts", href: "/crm/contacts" },
  { label: "Deals", icon: "navDeals", href: "/crm/deals" },
  { label: "Sales Dashboard", icon: "navDashboard", href: "/crm/dashboard" },
];

/** Supporting boards: reference data, property inventory and logistics. */
export const SECONDARY_NAV: NavItem[] = [
  { label: "Accounts", icon: "navAccounts", href: "/crm/accounts" },
  { label: "Client Projects", icon: "navProjects", href: "/crm/projects" },
  { label: "Developments", icon: "navProjects", href: "/crm/developments" },
  { label: "Units", icon: "navAccounts", href: "/crm/units" },
  { label: "Viewings", icon: "navActivities", href: "/crm/viewings" },
  { label: "Activities", icon: "navActivities", href: "/crm/activities" },
];

/** Every board, for lookups that do not care about the grouping. */
export const WORKSPACE_NAV: NavItem[] = [...PRIMARY_NAV, ...SECONDARY_NAV];

// Emails / Finance / Team moved to the left icon rail (IconRail) so the
// workspace sidebar stays a pure board list.
export function WorkspaceSidebar(_props: { role?: CrmRole }) {
  const pathname = usePathname();
  const rootRef = useRef<HTMLElement>(null);

  const renderItem = (item: NavItem) => {
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
          <LinkSpinner />
        </Link>
      </div>
    );
  };

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

        {/* board list — daily workflow above the rule, supporting boards below */}
        <nav className="mt-[4px] flex flex-col">
          {PRIMARY_NAV.map(renderItem)}

          <div className="my-[8px] px-[16px]">
            <span className="block h-px bg-line" />
          </div>

          {SECONDARY_NAV.map(renderItem)}
        </nav>
      </div>

    </aside>
  );
}
