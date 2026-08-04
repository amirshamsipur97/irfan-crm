"use client";

import { useMemo, useRef, useState } from "react";
import { Popover } from "@/components/crm/leads/cells";

/**
 * Dialling codes, with the markets this office actually sells to first, then
 * the rest alphabetically. The dial code alone is ambiguous (+1 is the US and
 * Canada, +7 is Russia and Kazakhstan), so every entry carries a country name —
 * that is what the agent picks, not a bare number.
 */
export type Country = { code: string; name: string; flag: string };

export const COUNTRIES: Country[] = [
  { code: "+968", name: "Oman", flag: "🇴🇲" },
  { code: "+971", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "+966", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+974", name: "Qatar", flag: "🇶🇦" },
  { code: "+965", name: "Kuwait", flag: "🇰🇼" },
  { code: "+973", name: "Bahrain", flag: "🇧🇭" },
  { code: "+98", name: "Iran", flag: "🇮🇷" },
  { code: "+91", name: "India", flag: "🇮🇳" },
  { code: "+92", name: "Pakistan", flag: "🇵🇰" },
  { code: "+20", name: "Egypt", flag: "🇪🇬" },
  { code: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { code: "+1", name: "United States", flag: "🇺🇸" },
  { code: "+7", name: "Russia", flag: "🇷🇺" },
  { code: "+90", name: "Turkey", flag: "🇹🇷" },
  // --- the long tail, alphabetical ---
  { code: "+93", name: "Afghanistan", flag: "🇦🇫" },
  { code: "+213", name: "Algeria", flag: "🇩🇿" },
  { code: "+61", name: "Australia", flag: "🇦🇺" },
  { code: "+43", name: "Austria", flag: "🇦🇹" },
  { code: "+994", name: "Azerbaijan", flag: "🇦🇿" },
  { code: "+880", name: "Bangladesh", flag: "🇧🇩" },
  { code: "+32", name: "Belgium", flag: "🇧🇪" },
  { code: "+55", name: "Brazil", flag: "🇧🇷" },
  { code: "+1", name: "Canada", flag: "🇨🇦" },
  { code: "+56", name: "Chile", flag: "🇨🇱" },
  { code: "+86", name: "China", flag: "🇨🇳" },
  { code: "+45", name: "Denmark", flag: "🇩🇰" },
  { code: "+251", name: "Ethiopia", flag: "🇪🇹" },
  { code: "+33", name: "France", flag: "🇫🇷" },
  { code: "+49", name: "Germany", flag: "🇩🇪" },
  { code: "+30", name: "Greece", flag: "🇬🇷" },
  { code: "+62", name: "Indonesia", flag: "🇮🇩" },
  { code: "+964", name: "Iraq", flag: "🇮🇶" },
  { code: "+353", name: "Ireland", flag: "🇮🇪" },
  { code: "+39", name: "Italy", flag: "🇮🇹" },
  { code: "+962", name: "Jordan", flag: "🇯🇴" },
  { code: "+7", name: "Kazakhstan", flag: "🇰🇿" },
  { code: "+254", name: "Kenya", flag: "🇰🇪" },
  { code: "+961", name: "Lebanon", flag: "🇱🇧" },
  { code: "+218", name: "Libya", flag: "🇱🇾" },
  { code: "+60", name: "Malaysia", flag: "🇲🇾" },
  { code: "+212", name: "Morocco", flag: "🇲🇦" },
  { code: "+31", name: "Netherlands", flag: "🇳🇱" },
  { code: "+234", name: "Nigeria", flag: "🇳🇬" },
  { code: "+47", name: "Norway", flag: "🇳🇴" },
  { code: "+63", name: "Philippines", flag: "🇵🇭" },
  { code: "+48", name: "Poland", flag: "🇵🇱" },
  { code: "+351", name: "Portugal", flag: "🇵🇹" },
  { code: "+40", name: "Romania", flag: "🇷🇴" },
  { code: "+65", name: "Singapore", flag: "🇸🇬" },
  { code: "+27", name: "South Africa", flag: "🇿🇦" },
  { code: "+34", name: "Spain", flag: "🇪🇸" },
  { code: "+94", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "+249", name: "Sudan", flag: "🇸🇩" },
  { code: "+46", name: "Sweden", flag: "🇸🇪" },
  { code: "+41", name: "Switzerland", flag: "🇨🇭" },
  { code: "+963", name: "Syria", flag: "🇸🇾" },
  { code: "+255", name: "Tanzania", flag: "🇹🇿" },
  { code: "+66", name: "Thailand", flag: "🇹🇭" },
  { code: "+216", name: "Tunisia", flag: "🇹🇳" },
  { code: "+256", name: "Uganda", flag: "🇺🇬" },
  { code: "+380", name: "Ukraine", flag: "🇺🇦" },
  { code: "+998", name: "Uzbekistan", flag: "🇺🇿" },
  { code: "+84", name: "Vietnam", flag: "🇻🇳" },
  { code: "+967", name: "Yemen", flag: "🇾🇪" },
];

export const DEFAULT_DIAL = "+968";

/** First country for a dial code — enough to show a flag next to a number. */
export function countryFor(code: string | null | undefined): Country | null {
  if (!code) return null;
  const clean = code.trim();
  return COUNTRIES.find((c) => c.code === clean) ?? null;
}

export function dialFlagFor(code: string | null | undefined): string {
  return countryFor(code)?.flag ?? "🌐";
}

/** Digits only, so `+968 9123 4567` and `99887766` store the same way. */
export function cleanNumber(value: string): string {
  return value.replace(/[^\d]/g, "");
}

/**
 * Country picker + number field.
 *
 * Phone used to be one free-text box that did not even save the country code,
 * so numbers arrived in a dozen shapes and could not be dialled or matched.
 * The code and the number are now chosen separately, in that order, and stored
 * in their own columns.
 */
export function PhoneFields({
  dial,
  number,
  onDialChange,
  onNumberChange,
  autoFocus = false,
  onEnter,
}: {
  dial: string;
  number: string;
  onDialChange: (code: string) => void;
  onNumberChange: (value: string) => void;
  autoFocus?: boolean;
  onEnter?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const numberRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.includes(q.replace(/^\+?/, "+"))
    );
  }, [query]);

  const current = countryFor(dial);

  return (
    <div className="flex items-stretch gap-[6px]">
      <div className="relative shrink-0">
        <button
          type="button"
          aria-label="Country code"
          onClick={() => {
            setQuery("");
            setOpen((v) => !v);
          }}
          className="flex h-[34px] items-center gap-[5px] rounded-[4px] border border-line-strong bg-white px-[8px] font-sans text-[13px] leading-[18px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
        >
          <span aria-hidden>{current?.flag ?? "🌐"}</span>
          <span className="tabular-nums">{dial || DEFAULT_DIAL}</span>
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#676879" strokeWidth="1.4" aria-hidden>
            <path d="M1.5 3.5L5 7l3.5-3.5" />
          </svg>
        </button>

        <Popover open={open} onClose={() => setOpen(false)} align="left" className="w-[260px] p-0">
          <div className="border-b border-line p-[8px]">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country or code"
              className="h-[30px] w-full rounded-[4px] border border-line-strong px-[8px] font-sans text-[13px] text-ink outline-none focus:border-teal-deep"
            />
          </div>
          <div className="thin-scroll max-h-[240px] touch-pan-y overflow-y-auto overscroll-contain py-[4px]">
            {matches.length === 0 && (
              <p className="m-0 px-[12px] py-[10px] font-sans text-[13px] text-ink-muted">
                No match
              </p>
            )}
            {matches.map((c) => (
              <button
                key={`${c.code}-${c.name}`}
                type="button"
                onClick={() => {
                  onDialChange(c.code);
                  setOpen(false);
                  // picking the country is step one — land the caret on step two
                  requestAnimationFrame(() => numberRef.current?.focus());
                }}
                className={`flex w-full items-center gap-[8px] px-[12px] py-[6px] text-left font-sans text-[13px] leading-[18px] transition-colors hover:bg-[var(--hover-ghost)] ${
                  c.code === dial ? "bg-[var(--hover-ghost)] font-medium" : ""
                }`}
              >
                <span aria-hidden>{c.flag}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{c.name}</span>
                <span className="shrink-0 tabular-nums text-ink-muted">{c.code}</span>
              </button>
            ))}
          </div>
        </Popover>
      </div>

      <input
        ref={numberRef}
        autoFocus={autoFocus}
        type="tel"
        inputMode="tel"
        value={number}
        onChange={(e) => onNumberChange(cleanNumber(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") onEnter?.();
        }}
        placeholder="9123 4567"
        className="h-[34px] min-w-0 flex-1 rounded-[4px] border border-line-strong bg-white px-[8px] font-sans text-[14px] tabular-nums text-ink outline-none focus:border-teal-deep"
      />
    </div>
  );
}
