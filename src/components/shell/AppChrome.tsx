"use client";

import { usePathname } from "next/navigation";
import { TopBar } from "./TopBar";
import { IconRail } from "./IconRail";
import { AnnouncementBanner } from "./AnnouncementBanner";
import type { CrmUser } from "@/lib/types";

/**
 * Global application chrome per the design:
 * announcement strip (workspace pages) → 48px top bar → 72px icon rail +
 * white content surface (rounded top-left, hairline border).
 */
export function AppChrome({
  profile,
  children,
}: {
  profile: CrmUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showBanner = pathname.startsWith("/crm");

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas">
      {showBanner && <AnnouncementBanner />}
      <TopBar profile={profile} />
      <div className="flex min-h-0 flex-1">
        <IconRail />
        <div className="relative flex min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

/** White main surface — every page renders inside one of these. */
export function Surface({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      className={`relative min-w-0 flex-1 overflow-hidden rounded-tl-[12px] border-l border-t border-line-soft bg-white shadow-[0px_4px_6px_-4px_rgba(0,0,0,0.1)] ${className}`}
    >
      {children}
    </main>
  );
}
