"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { signOut } from "@/app/(auth)/actions";
import { NotificationsBell } from "./NotificationsBell";
import { MessagesInbox } from "./MessagesInbox";
import { LinkSpinner } from "@/components/ui/LinkSpinner";
import { useRef, useState, useEffect } from "react";
import type { CrmUser } from "@/lib/types";
import { isFullAccess, ROLE_LABELS } from "@/lib/permissions";

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
    <header className="relative flex h-[48px] shrink-0 items-center justify-end bg-canvas pl-[4px] pr-[24px]">
      {/* brand, alone in the true centre of the bar — absolute so the tools
          cluster's width can never pull it off centre. NexProp wordmark at
          its native 194:31.82 ratio (the teal mark that used to sit on the
          left was Monday's own logo). */}
      <Link
        href="/"
        className="absolute left-1/2 flex h-[42px] -translate-x-1/2 items-center rounded-[4px] px-[6px]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/figma/auth_nexprop_logo.svg"
          alt="NexProp"
          width={134}
          height={22}
          className="block shrink-0 select-none"
          draggable={false}
        />
      </Link>

      {/* right: tools cluster */}
      <div className="flex items-center">
        <NotificationsBell profile={profile} />
        <span className="w-[4px]" />
        <MessagesInbox profile={profile} />
        <span className="w-[4px]" />
        <Link
          href="/help"
          aria-label="Help & guide"
          title="Help & guide"
          className="relative flex size-[40px] items-center justify-center rounded-[4px] transition-colors duration-150 hover:bg-[var(--hover-ghost)]"
        >
          <Icon name="help" size={20} />
          <LinkSpinner className="absolute right-[2px] top-[2px]" />
        </Link>
        {isFullAccess(profile.role) && (
          <>
            <div className="px-[4px]">
              <span className="block h-[22px] w-px bg-line" />
            </div>
            <Link
              href="/admin"
              aria-label="Administration"
              title="Administration"
              className="relative flex size-[40px] items-center justify-center rounded-[4px] transition-colors duration-150 hover:bg-[var(--hover-ghost)]"
            >
              <Icon name="appsGrid" size={20} />
              <LinkSpinner className="absolute right-[2px] top-[2px]" />
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
