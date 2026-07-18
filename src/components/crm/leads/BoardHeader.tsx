"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Avatar } from "@/components/ui/Avatar";
import { ICONS } from "@/lib/figma-icons";
import type { CrmUser } from "@/lib/types";

export type ItemHeight = "single" | "double" | "triple";

const ITEM_HEIGHT_OPTIONS: { key: ItemHeight; label: string }[] = [
  { key: "single", label: "Single" },
  { key: "double", label: "Double" },
  { key: "triple", label: "Triple" },
];

function HeightGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 2.8v10.4M4 2.8L2.4 4.4M4 2.8l1.6 1.6M4 13.2l-1.6-1.6M4 13.2l1.6-1.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.4 4h5.2M8.4 8h5.2M8.4 12h5.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

const MORE_MENU_ITEMS: { key: string; label: string; glyph: React.ReactNode }[] = [
  {
    key: "pin",
    label: "Pin columns",
    glyph: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M9.4 2.2l4.4 4.4-2.1.7-2.4 2.4-.3 2.8-2.5-2.5L3 13.5 2.5 13l3.5-3.5L3.5 7l2.8-.3 2.4-2.4.7-2.1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "sort",
    label: "Sort",
    glyph: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M5 2.8v10.4M5 2.8L3.2 4.6M5 2.8l1.8 1.8M11 13.2V2.8M11 13.2l-1.8-1.8M11 13.2l1.8-1.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "hide",
    label: "Hide",
    glyph: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M2 8s2.2-3.6 6-3.6S14 8 14 8s-2.2 3.6-6 3.6S2 8 2 8z" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="8" cy="8" r="1.7" stroke="currentColor" strokeWidth="1.2" />
        <path d="M3 13L13 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  { key: "height", label: "Item height", glyph: <HeightGlyph /> },
  {
    key: "coloring",
    label: "Conditional coloring",
    glyph: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M8 2.6s3.8 4 3.8 6.6a3.8 3.8 0 11-7.6 0C4.2 6.6 8 2.6 8 2.6z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "defaults",
    label: "Default item values",
    glyph: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M10.6 2.9l2.5 2.5L6 12.5l-3.2.7.7-3.2 7.1-7.1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    ),
  },
];

/** Toolbar "…" menu — 6 board options; Item height is functional (Single/Double/Triple). */
function MoreMenu({
  itemHeight,
  onItemHeight,
}: {
  itemHeight: ItemHeight;
  onItemHeight: (h: ItemHeight) => void;
}) {
  const [open, setOpen] = useState(false);
  const [heightOpen, setHeightOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setHeightOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="More options"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          setHeightOpen(false);
        }}
        className={`flex h-[32px] min-w-[32px] items-center justify-center rounded-[4px] px-[6px] transition-colors ${
          open ? "bg-teal-deep" : "hover:bg-[var(--hover-ghost)]"
        }`}
      >
        <Icon name="bhMore" size={20} className={open ? "brightness-0 invert" : ""} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[236px] rounded-[8px] border border-line bg-white p-[8px] shadow-[0px_6px_20px_rgba(0,0,0,0.2)]">
          {MORE_MENU_ITEMS.map((item) => {
            const isHeight = item.key === "height";
            return (
              <div key={item.key} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (isHeight) setHeightOpen((v) => !v);
                    else {
                      setOpen(false);
                      setHeightOpen(false);
                    }
                  }}
                  className={`flex h-[36px] w-full items-center gap-[10px] rounded-[4px] px-[10px] text-left font-sans text-[14px] leading-[20px] text-ink transition-colors ${
                    isHeight && heightOpen ? "bg-[var(--active-nav)]" : "hover:bg-[var(--hover-ghost)]"
                  }`}
                >
                  <span className="text-ink">{item.glyph}</span>
                  {item.label}
                </button>

                {isHeight && heightOpen && (
                  <div className="absolute right-[calc(100%+10px)] top-[-8px] z-50 w-[168px] rounded-[8px] border border-line bg-white p-[8px] shadow-[0px_6px_20px_rgba(0,0,0,0.2)]">
                    {ITEM_HEIGHT_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          onItemHeight(opt.key);
                          setOpen(false);
                          setHeightOpen(false);
                        }}
                        className={`flex h-[36px] w-full items-center gap-[10px] rounded-[4px] px-[10px] text-left font-sans text-[14px] leading-[20px] text-ink transition-colors ${
                          itemHeight === opt.key
                            ? "bg-[var(--active-nav)]"
                            : "hover:bg-[var(--hover-ghost)]"
                        }`}
                      >
                        <span className="text-ink">
                          <HeightGlyph />
                        </span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GhostAction({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="flex h-[32px] items-center justify-center gap-[8px] rounded-[4px] px-[8px] py-[4px] font-sans text-[14px] leading-[24px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
    >
      {icon}
      <span className="whitespace-nowrap">{children}</span>
    </button>
  );
}

/** Shared Monday-style board header: title row, view tabs and toolbar. */
export function BoardHeader({
  profile,
  title,
  tabs,
  activeTab,
  onTabChange,
  newLabel,
  onNew,
  automateLabel = "Automate / 6",
  showAiAgents = false,
  showImport = true,
  itemHeight,
  onItemHeight,
  searchValue,
  onSearch,
  users,
  personFilter,
  onPersonFilter,
}: {
  profile: CrmUser;
  title: string;
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  newLabel: string;
  onNew: () => void;
  automateLabel?: string;
  showAiAgents?: boolean;
  showImport?: boolean;
  /** when provided (with onItemHeight), the toolbar "…" opens the board-options menu */
  itemHeight?: ItemHeight;
  onItemHeight?: (h: ItemHeight) => void;
  /** when provided, the toolbar Search button becomes a live row filter */
  searchValue?: string;
  onSearch?: (q: string) => void;
  /** when provided (with onPersonFilter), the Person button filters by owner */
  users?: CrmUser[];
  personFilter?: string | null;
  onPersonFilter?: (ownerId: string | null) => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [personOpen, setPersonOpen] = useState(false);
  const personRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!personOpen) return;
    const handler = (e: MouseEvent) => {
      if (!personRef.current?.contains(e.target as Node)) setPersonOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [personOpen]);

  const activePerson = users?.find((u) => u.id === personFilter);

  return (
    <div className="shrink-0 border-b border-transparent bg-white pl-[38px] pr-[30px] pt-[18px]">
      {/* row 1 — board name + actions */}
      <div className="flex h-[32px] items-center justify-between">
        <button
          type="button"
          className="flex items-center gap-[4px] rounded-[4px] px-[4px] py-px transition-colors hover:bg-[var(--hover-ghost)]"
        >
          <h1 className="font-display text-[24px] font-medium leading-[30px] tracking-[-0.1px] text-ink">
            {title}
          </h1>
          <Icon name="bhTitleChevron" size={24} />
        </button>

        <div className="flex items-center gap-[4px]">
          {showAiAgents && (
            <button
              type="button"
              className="flex h-[32px] items-center rounded-[4px] px-[8px] py-[4px] transition-colors hover:bg-[var(--hover-ghost)]"
            >
              <span className="flex items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ICONS.aiAgentAvatar1}
                  alt=""
                  width={28}
                  height={28}
                  className="relative z-[2] rounded-full border border-white"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ICONS.aiAgentAvatar2}
                  alt=""
                  width={28}
                  height={28}
                  className="-ml-[8px] rounded-full border border-white"
                />
              </span>
              <span className="whitespace-nowrap pl-[8px] font-sans text-[14px] leading-[24px] text-ink">
                AI Agents
              </span>
              <span className="pl-[8px]">
                <Icon name="bhAiChevron" size={20} />
              </span>
            </button>
          )}
          {showImport && (
            <GhostAction icon={<Icon name="bhImport" size={20} />}>Import</GhostAction>
          )}
          <GhostAction icon={<Icon name="bhIntegrate" size={18} />}>Integrate</GhostAction>
          <GhostAction icon={<Icon name="bhAutomate" size={20} />}>{automateLabel}</GhostAction>
          <div className="relative">
            <GhostAction icon={<Icon name="bhAgents" size={20} />}>Agents</GhostAction>
            <span className="absolute -right-[2px] -top-[2px] flex rounded-[16px] border-2 border-white p-[2px]">
              <span className="size-[8px] rounded-[4px] bg-teal-deep" />
            </span>
          </div>
          <IconButton icon="bhChat" size={32} label="Board discussion" />
          <button type="button" className="flex h-[32px] items-center rounded-[4px] px-[8px] py-[4px] transition-colors hover:bg-[var(--hover-ghost)]">
            <Avatar name={profile.full_name || profile.email} src={profile.avatar_url} size={28} />
          </button>
          <span className="flex items-center pl-[4px]">
            <button
              type="button"
              className="-mr-px flex h-[32px] items-center justify-center whitespace-nowrap rounded-l-[4px] border border-line-strong px-[9px] py-[5px] font-sans text-[14px] leading-[22px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
            >
              Invite / 1
            </button>
            <button
              type="button"
              aria-label="Copy board link"
              className="flex size-[32px] items-center justify-center rounded-r-[4px] border border-line-strong p-px transition-colors hover:bg-[var(--hover-ghost)]"
            >
              <Icon name="bhLink" size={20} />
            </button>
          </span>
          <IconButton icon="bhDots" size={32} iconSize={24} label="Board options" />
        </div>
      </div>

      {/* row 2 — view tabs */}
      <div className="mt-[8px] flex h-[34px] items-center border-b border-line">
        {tabs.map((tab) => {
          const active = tab === activeTab;
          return (
            <div key={tab} className="relative flex h-[34px] items-start">
              <button
                type="button"
                onClick={() => onTabChange(tab)}
                className={`flex h-full flex-col items-start bg-white transition-colors ${
                  active
                    ? "border-b-2 border-teal-deep pb-[8px] pl-[2px] pr-[32px] pt-[4px]"
                    : "pb-[6px] pl-[14px] pr-[20px] pt-[4px] hover:bg-[var(--hover-ghost)]"
                }`}
              >
                <span
                  className={`whitespace-nowrap rounded-[4px] px-[5px] py-px font-sans text-[14px] leading-[20px] ${
                    active ? "text-ink" : "text-ink-muted"
                  }`}
                >
                  {tab}
                </span>
              </button>
              {active && (
                <button
                  type="button"
                  aria-label="Tab options"
                  className="absolute right-[8px] top-[5px] flex h-[27px] w-[20px] items-center justify-center rounded-[4px] p-[3px] transition-colors hover:bg-[var(--hover-ghost)]"
                >
                  <Icon name="bhTabDots" size={12} />
                </button>
              )}
            </div>
          );
        })}
        <button
          type="button"
          aria-label="Add view"
          className="flex size-[32px] min-w-[32px] items-center justify-center rounded-[4px] transition-colors hover:bg-[var(--hover-ghost)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ICONS.bhTabAdd} alt="" width={9} height={19} />
        </button>
      </div>

      {/* row 3 — board toolbar */}
      <div className="flex items-center justify-between py-[16px]">
        <div className="flex items-center">
          <span className="flex items-center pr-[14px]">
            <button
              type="button"
              onClick={onNew}
              className="flex h-[32px] items-center justify-center whitespace-nowrap rounded-l-[4px] bg-teal-deep px-[8px] py-[4px] font-sans text-[14px] leading-[24px] text-white transition-colors hover:bg-[#006e87]"
            >
              {newLabel}
            </button>
            <button
              type="button"
              aria-label={`${newLabel} options`}
              className="flex h-[32px] w-[28px] items-center justify-center rounded-r-[4px] border-l border-[#006278] bg-teal-deep transition-colors hover:bg-[#006e87]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ICONS.bhNewLeadCaret} alt="" width={10} height={15} />
            </button>
          </span>
          <span className="pr-[6px]">
            {onSearch && (searchOpen || (searchValue ?? "") !== "") ? (
              <span className="flex h-[32px] items-center gap-[6px] rounded-[4px] border border-teal-deep bg-white px-[8px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ICONS.bhSearch} alt="" width={15} height={20} />
                <input
                  autoFocus
                  value={searchValue ?? ""}
                  onChange={(e) => onSearch(e.target.value)}
                  onBlur={() => {
                    if (!(searchValue ?? "").trim()) setSearchOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      onSearch("");
                      setSearchOpen(false);
                    }
                  }}
                  placeholder="Search this board"
                  className="w-[170px] bg-transparent font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted"
                />
              </span>
            ) : (
              <button
                type="button"
                onClick={onSearch ? () => setSearchOpen(true) : undefined}
                className="flex h-[32px] items-center gap-0 rounded-[4px] border border-transparent p-px transition-colors hover:bg-[var(--hover-ghost)]"
              >
                <span className="pl-[10px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ICONS.bhSearch} alt="" width={15} height={20} />
                </span>
                <span className="px-[5px] pr-[9px] font-sans text-[14px] text-ink">Search</span>
              </button>
            )}
          </span>
          <span ref={personRef} className="relative pr-[6px]">
            <button
              type="button"
              onClick={onPersonFilter ? () => setPersonOpen((v) => !v) : undefined}
              className={`flex h-[32px] items-center justify-center rounded-[4px] transition-colors ${
                activePerson ? "bg-[var(--active-nav)]" : "hover:bg-[var(--hover-ghost)]"
              }`}
            >
              {activePerson ? (
                <span className="flex items-center gap-[6px] pl-[6px]">
                  <Avatar
                    name={activePerson.full_name || activePerson.email}
                    src={activePerson.avatar_url}
                    size={22}
                  />
                  <span className="max-w-[140px] truncate font-sans text-[14px] leading-[21px] text-ink">
                    {activePerson.full_name || activePerson.email}
                  </span>
                  <span
                    role="button"
                    aria-label="Clear person filter"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPersonFilter?.(null);
                      setPersonOpen(false);
                    }}
                    className="flex size-[20px] items-center justify-center rounded-[4px] pr-[4px] font-sans text-[13px] text-ink-muted hover:text-ink"
                  >
                    ✕
                  </span>
                </span>
              ) : (
                <>
                  <Icon name="bhPerson" size={20} className="w-[32px]" />
                  <span className="max-w-[140px] pr-[12px] font-sans text-[14px] leading-[21px] text-ink">
                    Person
                  </span>
                </>
              )}
            </button>
            {personOpen && users && (
              <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[230px] rounded-[8px] border border-line bg-white p-[8px] shadow-[0px_6px_20px_rgba(0,0,0,0.2)]">
                <p className="px-[8px] pb-[6px] font-sans text-[12px] font-semibold text-ink-muted">
                  Filter by owner
                </p>
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      onPersonFilter?.(u.id === personFilter ? null : u.id);
                      setPersonOpen(false);
                    }}
                    className={`flex w-full items-center gap-[8px] rounded-[4px] px-[8px] py-[6px] text-left transition-colors ${
                      u.id === personFilter ? "bg-[var(--active-nav)]" : "hover:bg-[var(--hover-ghost)]"
                    }`}
                  >
                    <Avatar name={u.full_name || u.email} src={u.avatar_url} size={24} />
                    <span className="truncate font-sans text-[14px] leading-[20px] text-ink">
                      {u.full_name || u.email}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </span>
          <span className="pr-[6px]">
            <button
              type="button"
              className="flex h-[32px] items-center overflow-hidden rounded-[4px] transition-colors hover:bg-[var(--hover-ghost)]"
            >
              <Icon name="bhFilter" size={20} className="w-[32px]" />
              <span className="font-sans text-[14px] leading-[21px] text-ink">Filter</span>
              <span className="ml-[6px] flex h-full items-center border-l border-white pl-px pr-[4px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ICONS.bhFilterCaret} alt="" width={9} height={12} />
              </span>
            </button>
          </span>
          <span className="pr-[6px]">
            <button
              type="button"
              className="flex h-[32px] items-center justify-center rounded-[4px] transition-colors hover:bg-[var(--hover-ghost)]"
            >
              <Icon name="bhGroupBy" size={20} className="w-[32px]" />
              <span className="max-w-[140px] pr-[12px] font-sans text-[14px] leading-[21px] text-ink">
                Group by
              </span>
            </button>
          </span>
          {itemHeight && onItemHeight ? (
            <MoreMenu itemHeight={itemHeight} onItemHeight={onItemHeight} />
          ) : (
            <button
              type="button"
              aria-label="More options"
              className="flex h-[32px] min-w-[32px] items-center justify-center rounded-[4px] px-[6px] transition-colors hover:bg-[var(--hover-ghost)]"
            >
              <Icon name="bhMore" size={20} />
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label="Collapse header"
          className="flex size-[24px] items-center justify-center rounded-[32px] bg-canvas transition-colors hover:bg-[var(--hover-ghost)]"
        >
          <Icon name="bhCollapse" size={16} />
        </button>
      </div>
    </div>
  );
}
