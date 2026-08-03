"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Avatar } from "@/components/ui/Avatar";
import { ICONS } from "@/lib/figma-icons";
import type { CrmUser } from "@/lib/types";
import {
  countActiveFilters,
  QuickFiltersPanel,
  type QuickFiltersProp,
} from "@/components/crm/quick-filters";

export type ItemHeight = "single" | "double" | "triple";

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
  automateLabel = "Automate",
  showImport = true,
  searchValue,
  onSearch,
  quickFilters,
}: {
  profile: CrmUser;
  title: string;
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  newLabel: string;
  onNew: () => void;
  automateLabel?: string;
  showImport?: boolean;
  /** when provided, the toolbar Search button becomes a live row filter */
  searchValue?: string;
  onSearch?: (q: string) => void;
  /** accepted for compatibility but IGNORED — the Person owner-filter button
      was removed (the quick-filters panel covers Owner); boards may still
      pass these without breaking */
  users?: CrmUser[];
  personFilter?: string | null;
  onPersonFilter?: (ownerId: string | null) => void;
  /** when provided, the Filter button opens the Monday-style quick-filters panel */
  quickFilters?: QuickFiltersProp;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLSpanElement>(null);

  const filterPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!filterRef.current?.contains(t) && !filterPanelRef.current?.contains(t))
        setFilterOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filterOpen]);

  const activeFilterCount = quickFilters ? countActiveFilters(quickFilters.state) : 0;

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
          {showImport && (
            <GhostAction icon={<Icon name="bhImport" size={20} />}>Import</GhostAction>
          )}
          <GhostAction icon={<Icon name="bhAutomate" size={20} />}>{automateLabel}</GhostAction>
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
      <div className="relative flex items-center justify-between py-[16px]">
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
                <img src={ICONS.bhSearch} alt="" width={15} height={15} />
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
                  <img src={ICONS.bhSearch} alt="" width={15} height={15} />
                </span>
                <span className="px-[5px] pr-[9px] font-sans text-[14px] text-ink">Search</span>
              </button>
            )}
          </span>
          <span ref={filterRef} className="relative pr-[6px]">
            <button
              type="button"
              onClick={quickFilters ? () => setFilterOpen((v) => !v) : undefined}
              className={`flex h-[32px] items-center overflow-hidden rounded-[4px] transition-colors ${
                filterOpen || activeFilterCount > 0
                  ? "bg-[var(--active-nav)]"
                  : "hover:bg-[var(--hover-ghost)]"
              }`}
            >
              <Icon name="bhFilter" size={16} className="w-[32px]" />
              <span className="font-sans text-[14px] leading-[21px] text-ink">
                Filter
                {activeFilterCount > 0 ? ` / ${activeFilterCount}` : ""}
              </span>
              {activeFilterCount > 0 ? (
                <span
                  role="button"
                  aria-label="Clear filters"
                  onClick={(e) => {
                    e.stopPropagation();
                    quickFilters?.onClear();
                    setFilterOpen(false);
                  }}
                  className="flex h-full items-center px-[6px] font-sans text-[13px] text-ink-muted hover:text-ink"
                >
                  ✕
                </span>
              ) : (
                <span className="ml-[6px] flex h-full items-center border-l border-white pl-px pr-[4px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ICONS.bhFilterCaret} alt="" width={9} height={12} />
                </span>
              )}
            </button>
          </span>
        </div>
        <button
          type="button"
          aria-label="Collapse header"
          className="flex size-[24px] items-center justify-center rounded-[32px] bg-canvas transition-colors hover:bg-[var(--hover-ghost)]"
        >
          <Icon name="bhCollapse" size={16} />
        </button>
        {filterOpen && quickFilters && (
          <div ref={filterPanelRef}>
            <QuickFiltersPanel {...quickFilters} />
          </div>
        )}
      </div>
    </div>
  );
}
