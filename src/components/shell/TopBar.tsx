"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { signOut } from "@/app/(auth)/actions";
import { NotificationsBell } from "./NotificationsBell";
import { useRef, useState, useEffect } from "react";
import type { CrmUser } from "@/lib/types";
import { isFullAccess, ROLE_LABELS } from "@/lib/permissions";

function TopIconButton({
  icon,
  counter,
  counterInverted = false,
  dot = false,
  label,
}: {
  icon: React.ReactNode;
  counter?: string;
  counterInverted?: boolean;
  dot?: boolean;
  label: string;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={label}
        title={label}
        className="flex size-[40px] items-center justify-center rounded-[4px] transition-colors duration-150 hover:bg-[var(--hover-ghost)]"
      >
        {icon}
      </button>
      {counter && (
        <span
          className={`absolute -top-[3px] right-[-3px] flex min-w-[18px] items-center justify-center rounded-[30px] px-[6px] font-sans text-[12px] leading-[18px] ${
            counterInverted
              ? "bg-white text-ink shadow-[0_0_0_1px_var(--color-line)]"
              : "bg-alert text-white"
          }`}
        >
          {counter}
        </span>
      )}
      {dot && (
        <span className="absolute right-[1px] top-0 flex rounded-[16px] border-2 border-white p-[2px]">
          <span className="size-[8px] rounded-[4px] bg-alert" />
        </span>
      )}
    </div>
  );
}

export function TopBar({ profile }: { profile: CrmUser }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  return (
    <header className="relative flex h-[48px] shrink-0 items-center justify-between bg-canvas pl-[4px] pr-[24px]">
      {/* left: product logo + contact sales */}
      <div className="flex items-center">
        <Link
          href="/"
          className="ml-[10px] flex h-[42px] items-center rounded-[4px] p-px"
        >
          <span className="flex size-[33px] items-center justify-center rounded-[6px] pl-[6px]">
            <Icon name="logo" size={25} />
          </span>
          <span className="flex items-center gap-[4px] pl-[6px] pr-[10px]">
            <span className="font-display text-[16px] font-light leading-[24px] text-ink">
              CRM
            </span>
          </span>
        </Link>
      </div>

      {/* center: global search */}
      <div className="pointer-events-none absolute inset-x-0 top-[8px] flex justify-center">
        <button
          type="button"
          className="pointer-events-auto flex h-[32px] w-[400px] items-center rounded-[100px] bg-[rgba(103,104,121,0.1)] p-px transition-colors hover:bg-[rgba(103,104,121,0.16)]"
        >
          <span className="flex w-[24px] flex-col items-start pl-[8px]">
            <Icon name="search" size={16} />
          </span>
          <span className="pl-[4px] font-sans text-[14px] leading-[20px] text-ink-muted">
            Search for anything...
          </span>
        </button>
      </div>

      {/* right: tools cluster */}
      <div className="flex items-center">
        <NotificationsBell />
        <span className="w-[4px]" />
        <TopIconButton label="Inbox" icon={<Icon name="inbox" size={20} />} />
        <span className="w-[4px]" />
        <TopIconButton label="Invite members" icon={<Icon name="invite" size={20} />} />
        <span className="w-[4px]" />
        <TopIconButton label="Apps marketplace" icon={<Icon name="marketplace" size={20} />} />
        <span className="w-[4px]" />
        <TopIconButton label="Settings" icon={<Icon name="settings" size={20} />} />
        <span className="w-[4px]" />
        <TopIconButton label="Help" dot icon={<Icon name="help" size={20} />} />
        {isFullAccess(profile.role) && (
          <>
            <div className="px-[4px]">
              <span className="block h-[22px] w-px bg-line" />
            </div>
            <Link
              href="/admin"
              aria-label="Administration"
              title="Administration"
              className="flex size-[40px] items-center justify-center rounded-[4px] transition-colors duration-150 hover:bg-[var(--hover-ghost)]"
            >
              <Icon name="appsGrid" size={20} />
            </Link>
          </>
        )}
        <div className="relative pl-[10px]" ref={menuRef}>
          <button
            type="button"
            aria-label="User menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="block rounded-[16px] transition-shadow hover:shadow-[0_0_0_2px_var(--color-cyan-tint)]"
          >
            <Avatar name={profile.full_name || profile.email} src={profile.avatar_url} size={32} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-[40px] z-50 w-[220px] rounded-[8px] border border-line bg-white py-[8px] shadow-[0px_6px_20px_rgba(0,0,0,0.2)]">
              <div className="border-b border-line-soft px-[16px] pb-[8px]">
                <p className="font-sans text-[14px] font-semibold leading-[20px] text-ink">
                  {profile.full_name || profile.email}
                </p>
                <p className="font-sans text-[12px] leading-[16px] text-ink-muted">
                  {ROLE_LABELS[profile.role]}
                </p>
              </div>
              <form action={signOut}>
                <button
                  type="submit"
                  className="mt-[4px] w-full px-[16px] py-[6px] text-left font-sans text-[14px] leading-[20px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
                >
                  Log out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
