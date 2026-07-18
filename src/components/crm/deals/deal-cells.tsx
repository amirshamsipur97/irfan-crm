"use client";

import { useState } from "react";
import { Popover } from "@/components/crm/leads/cells";
import type { CrmDeal, ForecastCategory } from "@/lib/types";
import { FORECAST_CATEGORIES, categoryMeta } from "./deals-config";

export function PersonGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="5.2" r="2.6" stroke="#323338" strokeWidth="1.3" />
      <path
        d="M2.8 13.4c.9-2.5 2.8-3.8 5.2-3.8s4.3 1.3 5.2 3.8"
        stroke="#323338"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BuildingGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="3" y="2.5" width="10" height="11" rx="1" stroke="#323338" strokeWidth="1.3" />
      <path
        d="M5.6 5.4h1.6M8.8 5.4h1.6M5.6 8h1.6M8.8 8h1.6M6.6 13.5v-2.6h2.8v2.6"
        stroke="#323338"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Contact / Account chip cell with inline editing (teal tint chip like Monday). */
export function ChipCell({
  value,
  kind,
  onSave,
}: {
  value: string | null;
  kind: "contact" | "account";
  onSave: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  if (editing) {
    const commit = () => {
      setEditing(false);
      if (draft !== (value ?? "")) onSave(draft);
    };
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        className="mx-[8px] h-[24px] w-full rounded-[4px] border border-teal-deep px-[6px] font-sans text-[14px] text-ink outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value ?? "");
        setEditing(true);
      }}
      className="flex size-full items-center justify-center px-[8px]"
      title={value ?? `Add ${kind}`}
    >
      {value ? (
        <span className="flex h-[24px] max-w-full items-center gap-[4px] truncate rounded-[4px] bg-cyan-tint px-[8px] font-sans text-[14px] leading-[20px] text-ink">
          {kind === "contact" ? <PersonGlyph /> : <BuildingGlyph />}
          <span className="truncate">{value}</span>
        </span>
      ) : (
        <span className="font-sans text-[14px] text-transparent transition-colors hover:text-ink-muted">
          +
        </span>
      )}
    </button>
  );
}

/** Expected close date: done-circle toggle + date (struck through when done). */
export function CloseDateCell({
  deal,
  onToggleDone,
  onDateChange,
}: {
  deal: CrmDeal;
  onToggleDone: () => void;
  onDateChange: (iso: string) => void;
}) {
  const label = deal.expected_close_date
    ? new Date(deal.expected_close_date + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <span className="flex size-full items-center justify-center gap-[8px] px-[8px]">
      <button
        type="button"
        aria-label={deal.is_done ? "Mark as not done" : "Mark as done"}
        onClick={onToggleDone}
        className="flex size-[18px] shrink-0 items-center justify-center"
      >
        {deal.is_done ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path
              d="M3.5 9.5l3.6 3.6L14.5 5.5"
              stroke="#00c875"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <span className="size-[16px] rounded-full border border-line-strong transition-colors hover:border-teal" />
        )}
      </button>
      <span className="relative">
        <input
          type="date"
          value={deal.expected_close_date ?? ""}
          onChange={(e) => e.target.value && onDateChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Expected close date"
        />
        <span
          className={`font-sans text-[14px] leading-[20px] ${
            deal.is_done ? "text-ink-muted line-through" : "text-ink"
          }`}
        >
          {label || <span className="text-ink-muted">Set date</span>}
        </span>
      </span>
    </span>
  );
}

/** Forecast category cell — full-bleed tag with picker. */
export function CategoryCell({
  value,
  isClosed,
  onSelect,
}: {
  value: ForecastCategory | null;
  isClosed: boolean;
  onSelect: (next: ForecastCategory | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const meta = categoryMeta(value);
  const bg = isClosed ? "#c4c4c4" : (meta?.color ?? "transparent");

  return (
    <div className="relative size-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex size-full items-center justify-center font-sans text-[14px] leading-[20px] text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: bg }}
      >
        {!isClosed && (meta?.label ?? "")}
      </button>
      <Popover open={open} onClose={() => setOpen(false)} className="w-[180px]">
        <div className="flex flex-col gap-[6px]">
          {FORECAST_CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => {
                onSelect(c.key);
                setOpen(false);
              }}
              className="flex h-[32px] items-center justify-center rounded-[4px] font-sans text-[14px] text-white transition-transform hover:scale-[1.03]"
              style={{ backgroundColor: c.color }}
            >
              {c.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setOpen(false);
            }}
            className="flex h-[32px] items-center justify-center rounded-[4px] bg-[#c4c4c4] font-sans text-[14px] text-white transition-transform hover:scale-[1.03]"
          >
            None
          </button>
        </div>
      </Popover>
    </div>
  );
}

/** Numeric cell with inline editing (deal value / probability). */
export function NumberCell({
  value,
  format,
  onSave,
  suffix = "",
}: {
  value: number | null;
  format: (v: number | null) => string;
  onSave: (next: number | null) => void;
  suffix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value?.toString() ?? "");

  if (editing) {
    const commit = () => {
      setEditing(false);
      const next = draft === "" ? null : Number(draft);
      if (next !== value) onSave(next);
    };
    return (
      <input
        autoFocus
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        className="mx-[8px] h-[24px] w-full rounded-[4px] border border-teal-deep px-[6px] text-center font-sans text-[14px] text-ink outline-none"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value?.toString() ?? "");
        setEditing(true);
      }}
      className="flex size-full items-center justify-center font-sans text-[14px] leading-[20px] text-ink"
    >
      {value != null ? `${format(value)}${suffix}` : ""}
    </button>
  );
}
