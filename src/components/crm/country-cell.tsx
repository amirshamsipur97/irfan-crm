"use client";

import { useMemo, useState } from "react";
import { Popover } from "@/components/crm/leads/cells";
import { COUNTRIES } from "@/components/crm/phone-input";

/** flag for a stored country NAME (the phone picker maps dial codes instead) */
export function countryFlag(name: string | null | undefined): string | null {
  if (!name) return null;
  const hit = COUNTRIES.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
  return hit?.flag ?? "🌐";
}

/**
 * The client's COUNTRY (nationality), picked separately from the phone code —
 * an Indian client living in Saudi Arabia carries a +966 number, so the dial
 * code can never stand in for where they are from.
 */
export function CountryCell({
  value,
  onSave,
}: {
  value: string | null;
  onSave: (next: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q));
  }, [query]);

  const flag = countryFlag(value);

  return (
    <div className="relative size-full">
      <button
        type="button"
        onClick={() => {
          setQuery("");
          setOpen((v) => !v);
        }}
        className={`flex size-full items-center justify-center gap-[6px] px-[8px] transition-colors hover:bg-[var(--hover-ghost)] ${
          open ? "bg-[var(--active-nav)]" : ""
        }`}
      >
        {value ? (
          <>
            <span aria-hidden>{flag}</span>
            <span className="truncate font-sans text-[14px] leading-[20px] text-ink">{value}</span>
          </>
        ) : (
          <span className="font-sans text-[14px] text-transparent transition-colors hover:text-ink-muted">
            +
          </span>
        )}
      </button>

      <Popover open={open} onClose={() => setOpen(false)} className="w-[260px] p-0">
        <div className="border-b border-line p-[8px]">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search country"
            className="h-[30px] w-full rounded-[4px] border border-line-strong px-[8px] font-sans text-[13px] text-ink outline-none focus:border-teal-deep"
          />
        </div>
        <div className="thin-scroll max-h-[240px] touch-pan-y overflow-y-auto overscroll-contain py-[4px]">
          {value && (
            <button
              type="button"
              onClick={() => {
                onSave(null);
                setOpen(false);
              }}
              className="flex w-full items-center gap-[8px] px-[12px] py-[6px] text-left font-sans text-[13px] leading-[18px] text-ink-muted transition-colors hover:bg-[var(--hover-ghost)]"
            >
              ✕ Clear country
            </button>
          )}
          {matches.length === 0 && (
            <p className="m-0 px-[12px] py-[10px] font-sans text-[13px] text-ink-muted">No match</p>
          )}
          {matches.map((c, i) => (
            <button
              key={`${c.name}|${i}`}
              type="button"
              onClick={() => {
                onSave(c.name);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-[8px] px-[12px] py-[6px] text-left font-sans text-[13px] leading-[18px] transition-colors hover:bg-[var(--hover-ghost)] ${
                c.name === value ? "bg-[var(--hover-ghost)] font-medium" : ""
              }`}
            >
              <span aria-hidden>{c.flag}</span>
              <span className="min-w-0 flex-1 truncate text-ink">{c.name}</span>
            </button>
          ))}
        </div>
      </Popover>
    </div>
  );
}
