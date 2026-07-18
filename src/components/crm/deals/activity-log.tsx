"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { anchorFixedPos } from "@/components/crm/leads/cells";

/** The board row an activity is being logged against (deal, lead, …). */
export interface LogTarget {
  name: string;
  contact_name?: string | null;
  account_name?: string | null;
}

export interface LogPayload {
  activityType: string;
  title: string;
  summary: string;
  startAt: string | null;
  endAt: string | null;
}

const LOG_TYPES: {
  key: string;
  label: string;
  title: string;
  activityType: string;
  color: string;
  placeholder: string;
  hasWhen: boolean;
}[] = [
  {
    key: "meeting",
    label: "Log meeting",
    title: "Meeting",
    activityType: "meeting",
    color: "#a25ddc",
    placeholder: "Write a new meeting summary...",
    hasWhen: true,
  },
  {
    key: "call",
    label: "Call summary",
    title: "Call summary",
    activityType: "call_summary",
    color: "#fdab3d",
    placeholder: "Write a new call summary...",
    hasWhen: true,
  },
  {
    key: "note",
    label: "Note",
    title: "Note",
    activityType: "note",
    color: "#f0646c",
    placeholder: "Write a new note...",
    hasWhen: false,
  },
  {
    key: "email",
    label: "Email",
    title: "Email",
    activityType: "email",
    color: "#579bfc",
    placeholder: "Write a new email...",
    hasWhen: true,
  },
];

function TypeGlyph({ type, size = 16 }: { type: string; size?: number }) {
  const s = { width: size, height: size };
  switch (type) {
    case "meeting":
      return (
        <svg {...s} viewBox="0 0 16 16" fill="none" aria-hidden>
          <rect x="2.4" y="3.4" width="11.2" height="10" rx="1.6" stroke="#fff" strokeWidth="1.4" />
          <path d="M5.4 2v2.6M10.6 2v2.6M2.6 6.6h10.8" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case "call":
      return (
        <svg {...s} viewBox="0 0 16 16" fill="none" aria-hidden>
          <rect x="4.6" y="2" width="6.8" height="12" rx="1.6" stroke="#fff" strokeWidth="1.4" />
          <path d="M7 12h2" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case "note":
      return (
        <svg {...s} viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M9.6 3.2l3.2 3.2-6.4 6.4H3.2V9.6l6.4-6.4z" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg {...s} viewBox="0 0 16 16" fill="none" aria-hidden>
          <rect x="2" y="3.4" width="12" height="9.2" rx="1.4" stroke="#fff" strokeWidth="1.4" />
          <path d="M2.6 4.6L8 9l5.4-4.4" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

/** "+ " menu on the Activities timeline cell: search + 4 essentials. */
export function ActivityLogMenu({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (typeKey: string) => void;
}) {
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const el = ref.current;
    const anchor = el?.parentElement?.getBoundingClientRect();
    if (el && anchor) setPos(anchorFixedPos(anchor, el.offsetWidth, el.offsetHeight, "right"));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const scrollClose = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("scroll", scrollClose, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("scroll", scrollClose, true);
    };
  }, [open, onClose]);

  if (!open) return null;

  const items = LOG_TYPES.filter((t) =>
    t.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div
      ref={ref}
      className="fixed z-[70] w-[260px] rounded-[8px] border border-line bg-white p-[12px] shadow-[0px_6px_20px_rgba(0,0,0,0.2)]"
      style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: -9999 }}
    >
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search activities"
        className="h-[36px] w-full rounded-[6px] border border-line-strong px-[10px] font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted focus:border-teal-deep"
      />
      <p className="pb-[4px] pt-[12px] font-sans text-[13px] leading-[18px] text-ink-muted">
        Essentials
      </p>
      {items.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onPick(t.key)}
          className="flex h-[44px] w-full items-center gap-[12px] rounded-[6px] px-[8px] text-left transition-colors hover:bg-[var(--hover-ghost)]"
        >
          <span
            className="flex size-[28px] items-center justify-center rounded-[8px]"
            style={{ backgroundColor: t.color }}
          >
            <TypeGlyph type={t.key} />
          </span>
          <span className="font-sans text-[15px] leading-[22px] text-ink">{t.label}</span>
        </button>
      ))}
      {items.length === 0 && (
        <p className="px-[8px] py-[10px] font-sans text-[13px] text-ink-muted">No matches</p>
      )}
    </div>
  );
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalInput(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** "Sat, 18 July 2026, 10:00 – 10:30 am" */
function whenLabel(start: Date, end: Date): string {
  const day = start.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const t = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
  let ts = t(start);
  const te = t(end);
  const suffix = ts.slice(-3);
  if (te.endsWith(suffix)) ts = ts.slice(0, -3);
  return `${day}, ${ts} – ${te}`;
}

function FooterIcon({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-[32px] items-center justify-center rounded-[4px] text-ink-muted transition-colors hover:bg-[var(--hover-ghost)]"
    >
      {children}
    </button>
  );
}

/** Monday-style composer modal for logging a meeting / call / note / email on a deal. */
export function ActivityComposer({
  typeKey,
  target,
  onClose,
  onAdd,
}: {
  typeKey: string;
  target: LogTarget;
  onClose: () => void;
  onAdd: (payload: LogPayload) => void;
}) {
  const meta = LOG_TYPES.find((t) => t.key === typeKey) ?? LOG_TYPES[0];
  const [summary, setSummary] = useState("");
  const [editWhen, setEditWhen] = useState(false);
  const [start, setStart] = useState(() => {
    const d = new Date();
    d.setHours(10, 0, 0, 0);
    return d;
  });
  const [end, setEnd] = useState(() => {
    const d = new Date();
    d.setHours(10, 30, 0, 0);
    return d;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const associations = 1 + (target.contact_name ? 1 : 0) + (target.account_name ? 1 : 0);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(41,47,76,0.4)] p-[24px]">
      <div className="flex h-[600px] w-[700px] max-w-full flex-col overflow-hidden rounded-[8px] bg-white shadow-[0px_16px_40px_rgba(0,0,0,0.3)]">
        {/* header */}
        <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-line bg-canvas px-[16px]">
          <span className="flex items-center gap-[10px]">
            <span
              className="flex size-[28px] items-center justify-center rounded-[8px]"
              style={{ backgroundColor: meta.color }}
            >
              <TypeGlyph type={meta.key} />
            </span>
            <span className="font-display text-[16px] font-semibold leading-[24px] text-ink">
              {meta.title}
            </span>
          </span>
          <span className="flex items-center gap-[4px]">
            <FooterIcon label="Feedback">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                <path d="M9 15.2c3.8 0 6.6-2.5 6.6-5.9S12.8 3.4 9 3.4 2.4 5.9 2.4 9.3c0 1.5.6 2.9 1.5 3.9l-.6 2.4 2.5-.9c1 .3 2 .5 3.2.5z" stroke="#676879" strokeWidth="1.3" strokeLinejoin="round" />
                <path d="M6.8 8.4c.3-1 1.2-1.5 2.2-1.5s2 .6 2 1.6c0 .9-.7 1.2-2 2.1" stroke="#676879" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </FooterIcon>
            <FooterIcon label="Expand">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M9.6 2.4h4v4M6.4 13.6h-4v-4M13.6 2.4L9.4 6.6M2.4 13.6l4.2-4.2" stroke="#676879" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </FooterIcon>
            <FooterIcon label="Close">
              <span onClick={onClose} className="flex size-full items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="#676879" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </span>
            </FooterIcon>
          </span>
        </div>

        {/* when row */}
        {meta.hasWhen && (
          <div className="shrink-0 border-b border-line px-[20px] py-[12px]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-[10px]">
                <span className="font-sans text-[15px] leading-[22px] text-ink-muted">When</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <circle cx="8" cy="8" r="6.2" stroke="#676879" strokeWidth="1.3" />
                  <path d="M8 4.6V8l2.3 1.5" stroke="#676879" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                <span className="font-sans text-[15px] leading-[22px] text-ink">
                  {whenLabel(start, end)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setEditWhen((v) => !v)}
                className="rounded-[4px] px-[8px] py-[4px] font-sans text-[15px] leading-[22px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
              >
                Change date
              </button>
            </div>
            {editWhen && (
              <div className="flex items-center gap-[12px] pt-[10px]">
                <input
                  type="datetime-local"
                  aria-label="Start"
                  value={toLocalInput(start)}
                  onChange={(e) => e.target.value && setStart(new Date(e.target.value))}
                  className="h-[32px] rounded-[4px] border border-line-strong px-[8px] font-sans text-[13px] text-ink outline-none focus:border-teal-deep"
                />
                <span className="font-sans text-[13px] text-ink-muted">to</span>
                <input
                  type="datetime-local"
                  aria-label="End"
                  value={toLocalInput(end)}
                  onChange={(e) => e.target.value && setEnd(new Date(e.target.value))}
                  className="h-[32px] rounded-[4px] border border-line-strong px-[8px] font-sans text-[13px] text-ink outline-none focus:border-teal-deep"
                />
              </div>
            )}
          </div>
        )}

        {/* summary */}
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder={meta.placeholder}
          className="min-h-0 flex-1 resize-none px-[20px] py-[16px] font-sans text-[15px] leading-[22px] text-ink outline-none placeholder:text-ink-muted"
        />

        {/* footer */}
        <div className="flex h-[60px] shrink-0 items-center justify-between border-t border-line px-[16px]">
          <span className="flex items-center gap-[2px]">
            <FooterIcon label="Discard">
              <span onClick={onClose} className="flex size-full items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M3 4.4h10M6.2 4.4V3h3.6v1.4M4.2 4.4l.7 8.2c0 .6.5 1 1 1h4.2c.5 0 1-.4 1-1l.7-8.2" stroke="#676879" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </span>
            </FooterIcon>
            <span className="mx-[6px] h-[22px] w-px bg-line" />
            <FooterIcon label="Insert">
              <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden>
                <circle cx="8" cy="8" r="6.2" stroke="#676879" strokeWidth="1.2" />
                <path d="M8 5.2v5.6M5.2 8h5.6" stroke="#676879" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </FooterIcon>
            <FooterIcon label="Text style">
              <span className="font-sans text-[15px] leading-[20px] text-ink-muted">Aa</span>
            </FooterIcon>
            {meta.key !== "note" && (
              <>
                <FooterIcon label="Placeholders">
                  <span className="font-mono text-[13px] leading-[20px] text-ink-muted">{"{}"}</span>
                </FooterIcon>
                <FooterIcon label="Attach">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M10.9 4.6L6.3 9.2a1.5 1.5 0 002.1 2.1l4.9-4.9a3 3 0 00-4.2-4.2L4 7.3a4.4 4.4 0 006.2 6.2l4-4" stroke="#676879" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </FooterIcon>
              </>
            )}
            <FooterIcon label="Templates">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <rect x="3" y="2.4" width="10" height="11.2" rx="1.2" stroke="#676879" strokeWidth="1.2" />
                <path d="M9.6 13.4V10h2.8" stroke="#676879" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
            </FooterIcon>
          </span>

          <span className="flex items-center gap-[10px]">
            <span className="flex h-[36px] items-center gap-[8px] rounded-[6px] bg-cyan-tint px-[12px]">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <circle cx="8" cy="4" r="1.8" stroke="#323338" strokeWidth="1.2" />
                <circle cx="4" cy="11.6" r="1.8" stroke="#323338" strokeWidth="1.2" />
                <circle cx="12" cy="11.6" r="1.8" stroke="#323338" strokeWidth="1.2" />
                <path d="M7 5.4l-1.9 4.4M9 5.4l1.9 4.4M5.8 11.6h4.4" stroke="#323338" strokeWidth="1.1" />
              </svg>
              <span className="font-sans text-[14px] leading-[20px] text-ink">
                {associations} association{associations === 1 ? "" : "s"}
              </span>
            </span>
            <button
              type="button"
              onClick={() =>
                onAdd({
                  activityType: meta.activityType,
                  title: meta.title,
                  summary: summary.trim(),
                  startAt: meta.hasWhen ? start.toISOString() : null,
                  endAt: meta.hasWhen ? end.toISOString() : null,
                })
              }
              className="h-[36px] rounded-[4px] bg-teal-deep px-[16px] font-sans text-[14px] leading-[24px] text-white transition-colors hover:bg-[#006e87]"
            >
              Add
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
