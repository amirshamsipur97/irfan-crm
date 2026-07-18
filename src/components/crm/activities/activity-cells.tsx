"use client";

import { useEffect, useRef, useState } from "react";
import { activityTime } from "./activities-config";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const POPOVER_W = 292;
const POPOVER_H = 420;

/** merge a picked calendar day with the time-of-day of the current value (9:00 default) */
function withTime(day: Date, current: string | null): string {
  const d = new Date(day);
  if (current) {
    const c = new Date(current);
    d.setHours(c.getHours(), c.getMinutes(), 0, 0);
  } else {
    d.setHours(9, 0, 0, 0);
  }
  return d.toISOString();
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Start/End time cell — Monday-style calendar popover (Today, date input, month grid). */
export function TimeCell({
  value,
  onChange,
  label,
  format = activityTime,
}: {
  value: string | null;
  onChange: (iso: string | null) => void;
  label: string;
  /** cell display formatting (defaults to "Jun 30, 7:00 PM") */
  format?: (iso: string | null) => string;
}) {
  const [open, setOpen] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const selected = value ? new Date(value) : null;
  const today = new Date();
  const [viewYear, setViewYear] = useState((selected ?? today).getFullYear());
  const [viewMonth, setViewMonth] = useState((selected ?? today).getMonth());
  const [draft, setDraft] = useState("");
  const rootRef = useRef<HTMLSpanElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const openPicker = () => {
    const base = selected ?? today;
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setDraft(`${pad2(base.getMonth() + 1)}/${pad2(base.getDate())}/${base.getFullYear()}`);
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      // viewport dims can be 0 in embedded webviews — then just anchor to the cell
      const vw = window.innerWidth || document.documentElement.clientWidth;
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const below = rect.bottom + 4;
      const left = vw ? Math.max(8, Math.min(rect.left, vw - POPOVER_W - 12)) : rect.left;
      const top = vh
        ? Math.max(8, below + POPOVER_H > vh ? rect.top - POPOVER_H - 4 : below)
        : below;
      setPos({ left, top });
    }
    setShowTime(false);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const commitDraft = () => {
    const parsed = new Date(draft);
    if (!Number.isNaN(parsed.getTime())) {
      onChange(withTime(parsed, value));
      setOpen(false);
    }
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  // 6-week grid starting Monday
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(viewYear, viewMonth, 1 - startOffset + i);
    return d;
  });

  const years = Array.from({ length: 12 }, (_, i) => today.getFullYear() - 5 + i);

  const timeValue = selected
    ? `${pad2(selected.getHours())}:${pad2(selected.getMinutes())}`
    : "09:00";

  return (
    <span ref={rootRef} className="relative block size-full">
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        onClick={() => (open ? setOpen(false) : openPicker())}
        className={`flex size-full items-center justify-center px-[8px] ${
          open ? "bg-teal-deep" : ""
        }`}
      >
        <span
          className={`truncate font-sans text-[14px] leading-[20px] ${
            open ? "text-white" : "text-ink"
          }`}
        >
          {format(value)}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`${label} picker`}
          className="fixed z-[80] rounded-[8px] border border-line bg-white p-[16px] shadow-[0px_6px_20px_rgba(0,0,0,0.2)]"
          style={{ left: pos.left, top: pos.top, width: POPOVER_W }}
        >
          {/* Today + clock */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onChange(withTime(today, value));
                setOpen(false);
              }}
              className="h-[32px] rounded-[4px] border border-line-strong px-[12px] font-sans text-[14px] leading-[20px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
            >
              Today
            </button>
            <button
              type="button"
              aria-label="Set time"
              onClick={() => setShowTime((v) => !v)}
              className={`flex size-[32px] items-center justify-center rounded-[16px] transition-colors ${
                showTime ? "bg-[var(--active-nav)]" : "hover:bg-[var(--hover-ghost)]"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                <circle cx="9" cy="9" r="7" stroke="#323338" strokeWidth="1.3" />
                <path d="M9 5.2V9l2.6 1.7" stroke="#323338" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* date input (+ optional time input) */}
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitDraft();
            }}
            aria-label="Date"
            placeholder="MM/DD/YYYY"
            className="mt-[12px] h-[36px] w-full rounded-[4px] border border-teal-deep px-[10px] font-sans text-[14px] text-ink outline-none"
          />
          {showTime && (
            <input
              type="time"
              aria-label="Time"
              value={timeValue}
              onChange={(e) => {
                if (!e.target.value) return;
                const [h, m] = e.target.value.split(":").map(Number);
                const base = selected ?? today;
                const d = new Date(base);
                d.setHours(h, m, 0, 0);
                onChange(d.toISOString());
              }}
              className="mt-[8px] h-[32px] w-full rounded-[4px] border border-line-strong px-[10px] font-sans text-[14px] text-ink outline-none focus:border-teal-deep"
            />
          )}

          {/* month / year selectors */}
          <div className="mt-[12px] flex items-center justify-between">
            <span className="flex items-center gap-[8px]">
              <select
                aria-label="Month"
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="h-[28px] cursor-pointer rounded-[4px] bg-transparent font-sans text-[14px] text-ink outline-none hover:bg-[var(--hover-ghost)]"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                aria-label="Year"
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="h-[28px] cursor-pointer rounded-[4px] bg-transparent font-sans text-[14px] text-ink outline-none hover:bg-[var(--hover-ghost)]"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </span>
            <span className="flex items-center gap-[4px]">
              <button
                type="button"
                aria-label="Previous month"
                onClick={prevMonth}
                className="flex size-[28px] items-center justify-center rounded-[4px] transition-colors hover:bg-[var(--hover-ghost)]"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M8.8 2.8L4.6 7l4.2 4.2" stroke="#323338" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={nextMonth}
                className="flex size-[28px] items-center justify-center rounded-[4px] transition-colors hover:bg-[var(--hover-ghost)]"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M5.2 2.8L9.4 7l-4.2 4.2" stroke="#323338" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </span>
          </div>

          {/* weekday header + day grid */}
          <div className="mt-[8px] grid grid-cols-7 gap-y-[2px]">
            {WEEKDAYS.map((wd) => (
              <span
                key={wd}
                className="flex h-[28px] items-center justify-center font-sans text-[12px] font-semibold text-ink-muted"
              >
                {wd}
              </span>
            ))}
            {days.map((d) => {
              const inMonth = d.getMonth() === viewMonth;
              const isSelected = selected ? sameDay(d, selected) : false;
              const isToday = sameDay(d, today);
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => {
                    onChange(withTime(d, value));
                    setOpen(false);
                  }}
                  className={`mx-auto flex size-[30px] items-center justify-center rounded-[4px] font-sans text-[13px] leading-[18px] transition-colors ${
                    isSelected
                      ? "bg-teal-deep text-white"
                      : inMonth
                        ? "text-ink hover:bg-[var(--hover-ghost)]"
                        : "text-ink-disabled hover:bg-[var(--hover-ghost)]"
                  } ${isToday && !isSelected ? "font-semibold underline underline-offset-[3px]" : ""}`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {/* footer */}
          <div className="mt-[10px] flex items-center justify-center gap-[8px] border-t border-line pt-[10px]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M8 1.8l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5 1.5-4z" fill="#a25ddc" />
              <path d="M12.8 10.6l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9z" fill="#00d2d2" />
            </svg>
            <span className="font-sans text-[14px] leading-[20px] text-ink">Autofill date</span>
          </div>
        </div>
      )}
    </span>
  );
}

function RelatedEditor({
  initial,
  onSave,
  onDone,
  asAdd = false,
}: {
  initial: string;
  onSave: (next: string) => void;
  onDone?: () => void;
  asAdd?: boolean;
}) {
  const [editing, setEditing] = useState(!asAdd);
  const [draft, setDraft] = useState(initial);

  if (asAdd && !editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex size-full items-center justify-center font-sans text-[14px] text-transparent transition-colors hover:text-ink-muted"
      >
        +
      </button>
    );
  }

  const commit = () => {
    setEditing(false);
    onDone?.();
    if (draft !== initial) onSave(draft);
  };

  return (
    <input
      autoFocus
      value={draft}
      placeholder="Deal or lead name"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setEditing(false);
          onDone?.();
        }
      }}
      className="h-[24px] w-full rounded-[4px] border border-teal-deep px-[6px] text-center font-sans text-[14px] text-ink outline-none"
    />
  );
}

function RelatedChip({ value, onSave }: { value: string; onSave: (next: string) => void }) {
  const [editing, setEditing] = useState(false);
  if (editing)
    return <RelatedEditor initial={value} onSave={onSave} onDone={() => setEditing(false)} />;
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex h-[26px] max-w-full items-center truncate rounded-[4px] border border-line px-[10px] font-sans text-[14px] leading-[20px] text-ink transition-colors hover:border-line-strong"
      title={value}
    >
      <span className="truncate">{value}</span>
    </button>
  );
}

/** Related item cell — bordered tag chip, inline editable (links a deal/lead by name). */
export function RelatedItemCell({
  value,
  onSave,
}: {
  value: string | null;
  onSave: (next: string) => void;
}) {
  return (
    <span className="flex size-full items-center justify-center px-[8px]">
      {value ? (
        <RelatedChip value={value} onSave={onSave} />
      ) : (
        <RelatedEditor initial="" onSave={onSave} asAdd />
      )}
    </span>
  );
}
