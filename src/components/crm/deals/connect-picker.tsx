"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { anchorFixedPos } from "@/components/crm/leads/cells";
import { BuildingGlyph, PersonGlyph } from "./deal-cells";

export interface PickerOption {
  name: string;
  /** gray second line, e.g. "C-0004 · Muriya Tourism Development" */
  sub?: string | null;
  /** the row's real id — several people can share one name, this cannot */
  id?: string;
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
  /** id is set when the option carries one — patch the FK with it, not the name */
  onPick: (name: string, id?: string) => void;
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
    // the panel is portalled to <body>, so "inside" means the trigger OR the panel
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
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

      {/* portalled to <body>: each board group is its own stacking context, so
          an inline fixed panel gets painted UNDER the next group's sticky
          title no matter its z-index — same fix the shared Popover uses */}
      {open &&
        createPortal(
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
                  if (hit) onPick(hit.name, hit.id);
                  else onCreate(query.trim());
                  setOpen(false);
                }
              }}
              placeholder={`Type to find or create ${entityLabel}`}
              className="w-full bg-transparent font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted"
            />
          </div>

          <div className="thin-scroll mt-[6px] max-h-[240px] overflow-y-auto">
            {/* names are NOT unique (several contacts share one) — a bare
                name key made React drop/duplicate rows while filtering */}
            {filtered.map((o, i) => (
              <button
                key={`${o.name}|${o.sub ?? ""}|${i}`}
                type="button"
                onClick={() => {
                  onPick(o.name, o.id);
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
        </div>,
        document.body
      )}
    </div>
  );
}

/**
 * The "+ Add offer" row's live client search: an always-visible input that
 * recalls Contacts as you type (by name or C-code), so a new offer starts
 * linked to the exact person — their demand mirrors into the row instantly.
 * Free text that matches nobody falls back to the plain unlinked add.
 */
export function AddRowClientPicker({
  options,
  placeholder,
  onPick,
  onPlain,
}: {
  options: PickerOption[];
  placeholder: string;
  /** an existing contact was chosen — create the offer linked to them */
  onPick: (option: PickerOption) => void;
  /** free text matching no contact — the old unlinked add */
  onPlain: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const q = query.trim().toLowerCase();
  const filtered = options.filter(
    (o) => !q || o.name.toLowerCase().includes(q) || (o.sub ?? "").toLowerCase().includes(q)
  );
  const activeIdx = Math.min(active, Math.max(filtered.length - 1, 0));

  // re-anchor when the list length changes — filtering resizes the panel
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const el = panelRef.current;
    const anchor = rootRef.current?.getBoundingClientRect();
    if (el && anchor) setPos(anchorFixedPos(anchor, el.offsetWidth, el.offsetHeight, "left"));
  }, [open, filtered.length]);

  useEffect(() => {
    if (!open) return;
    // portalled to <body>, so "inside" means the input OR the panel
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
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

  const finish = () => {
    setQuery("");
    setActive(0);
    setOpen(false);
    inputRef.current?.focus();
  };
  const pick = (o: PickerOption) => {
    onPick(o);
    finish();
  };
  const plain = () => {
    const name = query.trim();
    if (!name) return;
    onPlain(name);
    finish();
  };

  return (
    <div ref={rootRef} className="w-full">
      <input
        ref={inputRef}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((v) => Math.min(v + 1, filtered.length - 1));
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((v) => Math.max(v - 1, 0));
            return;
          }
          if (e.key === "Enter") {
            if (open && filtered.length > 0) pick(filtered[activeIdx]);
            else if (query.trim()) plain();
          }
        }}
        placeholder={placeholder}
        className="h-[24px] w-full min-w-[200px] rounded-[4px] bg-transparent px-[4px] font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted focus:border focus:border-teal-deep focus:bg-white"
      />

      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-[70] w-[300px] rounded-[8px] border border-line bg-white p-[6px] shadow-[0px_6px_20px_rgba(0,0,0,0.2)]"
            style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: -9999 }}
          >
            <div className="thin-scroll max-h-[240px] overflow-y-auto">
              {filtered.map((o, i) => (
                <button
                  key={`${o.name}|${o.sub ?? ""}|${i}`}
                  type="button"
                  onClick={() => pick(o)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center gap-[10px] rounded-[6px] px-[10px] py-[8px] text-left transition-colors ${
                    i === activeIdx ? "bg-[var(--hover-ghost)]" : ""
                  }`}
                >
                  <span className="flex size-[24px] shrink-0 items-center justify-center rounded-full border border-line-strong">
                    <PersonGlyph />
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

              {filtered.length === 0 && query.trim() && (
                <button
                  type="button"
                  onClick={plain}
                  className="flex w-full items-center gap-[10px] rounded-[6px] px-[10px] py-[8px] text-left transition-colors hover:bg-[var(--hover-ghost)]"
                >
                  <span className="flex size-[24px] shrink-0 items-center justify-center rounded-full bg-teal-deep font-sans text-[16px] leading-none text-white">
                    +
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-sans text-[14px] leading-[20px] text-ink">
                      Add offer &ldquo;{query.trim()}&rdquo;
                    </span>
                    <span className="block truncate font-sans text-[12px] leading-[16px] text-ink-muted">
                      no matching client — it will not be linked
                    </span>
                  </span>
                </button>
              )}

              {filtered.length === 0 && !query.trim() && (
                <p className="m-0 px-[10px] py-[8px] font-sans text-[13px] text-ink-muted">
                  No clients yet — convert a lead or add one on Contacts.
                </p>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
