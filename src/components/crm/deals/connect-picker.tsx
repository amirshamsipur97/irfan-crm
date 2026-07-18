"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { anchorFixedPos } from "@/components/crm/leads/cells";
import { BuildingGlyph, PersonGlyph } from "./deal-cells";

export interface PickerOption {
  name: string;
  /** gray second line, e.g. the account a contact belongs to */
  sub?: string | null;
}

/**
 * Monday-style connected-board cell: chip with ✕, dropdown with
 * "Type to find or create …", existing options and a create row.
 */
export function ConnectPicker({
  value,
  options,
  entityLabel,
  kind,
  onPick,
  onClear,
  onCreate,
}: {
  value: string | null;
  options: PickerOption[];
  entityLabel: string;
  kind: "account" | "contact";
  onPick: (name: string) => void;
  onClear: () => void;
  onCreate: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const el = panelRef.current;
    const anchor = rootRef.current?.getBoundingClientRect();
    if (el && anchor) setPos(anchorFixedPos(anchor, el.offsetWidth, el.offsetHeight, "center"));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const handler = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const scrollClose = (e: Event) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("scroll", scrollClose, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("scroll", scrollClose, true);
    };
  }, [open]);

  const glyph = kind === "account" ? <BuildingGlyph /> : <PersonGlyph />;
  const q = query.trim().toLowerCase();
  const filtered = options.filter((o) => !q || o.name.toLowerCase().includes(q));
  const exactMatch = options.some((o) => o.name.toLowerCase() === q);

  return (
    <div ref={rootRef} className="relative size-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex size-full items-center justify-center px-[8px] ${
          open ? "bg-[var(--active-nav)]" : ""
        }`}
      >
        {value ? (
          <span className="group/chip flex h-[24px] max-w-full items-center gap-[4px] truncate rounded-[4px] bg-cyan-tint px-[8px] font-sans text-[14px] leading-[20px] text-ink">
            {glyph}
            <span className="truncate">{value}</span>
            <span
              role="button"
              aria-label={`Remove ${entityLabel.toLowerCase()}`}
              onClick={(e) => {
                e.stopPropagation();
                onClear();
                setOpen(false);
              }}
              className="pl-[2px] font-sans text-[13px] text-ink-muted hover:text-ink"
            >
              ✕
            </span>
          </span>
        ) : (
          <span className="font-sans text-[14px] text-transparent transition-colors hover:text-ink-muted">
            +
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="fixed z-[70] w-[300px] rounded-[8px] border border-line bg-white p-[10px] shadow-[0px_6px_20px_rgba(0,0,0,0.2)]"
          style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: -9999 }}
        >
          <div className="flex h-[38px] items-center gap-[8px] rounded-[6px] border border-line-strong px-[10px] focus-within:border-teal-deep">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
              <circle cx="6.4" cy="6.4" r="4.6" stroke="#676879" strokeWidth="1.4" />
              <path d="M9.9 9.9l3 3" stroke="#676879" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                if (e.key === "Enter" && query.trim()) {
                  const hit = options.find((o) => o.name.toLowerCase() === q);
                  if (hit) onPick(hit.name);
                  else onCreate(query.trim());
                  setOpen(false);
                }
              }}
              placeholder={`Type to find or create ${entityLabel}`}
              className="w-full bg-transparent font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted"
            />
          </div>

          <div className="thin-scroll mt-[6px] max-h-[240px] overflow-y-auto">
            {filtered.map((o) => (
              <button
                key={o.name}
                type="button"
                onClick={() => {
                  onPick(o.name);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-[10px] rounded-[6px] px-[10px] py-[8px] text-left transition-colors ${
                  o.name === value ? "bg-[var(--active-nav)]" : "hover:bg-[var(--hover-ghost)]"
                }`}
              >
                <span className="flex size-[24px] shrink-0 items-center justify-center rounded-full border border-line-strong">
                  {glyph}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-sans text-[14px] leading-[20px] text-ink">
                    {o.name}
                  </span>
                  {o.sub && (
                    <span className="block truncate font-sans text-[12px] leading-[16px] text-ink-muted">
                      {o.sub}
                    </span>
                  )}
                </span>
              </button>
            ))}

            {query.trim() && !exactMatch && (
              <button
                type="button"
                onClick={() => {
                  onCreate(query.trim());
                  setOpen(false);
                }}
                className="flex w-full items-center gap-[10px] rounded-[6px] px-[10px] py-[8px] text-left transition-colors hover:bg-[var(--hover-ghost)]"
              >
                <span className="flex size-[24px] shrink-0 items-center justify-center rounded-full bg-teal-deep font-sans text-[16px] leading-none text-white">
                  +
                </span>
                <span className="truncate font-sans text-[14px] leading-[20px] text-ink">
                  Create &ldquo;{query.trim()}&rdquo;
                </span>
              </button>
            )}

            {filtered.length === 0 && !query.trim() && (
              <p className="px-[10px] py-[8px] font-sans text-[13px] text-ink-muted">
                No {entityLabel.toLowerCase()} yet — type a name to create one.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
