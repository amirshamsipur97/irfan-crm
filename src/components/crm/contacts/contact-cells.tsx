"use client";

import { useState } from "react";
import { CELL_BUTTON, CELL_INPUT } from "@/components/crm/cell-style";
import { Popover } from "@/components/crm/leads/cells";

/** Full-bleed colored option cell (Type / Priority), gray when empty. */
export function OptionCell({
  value,
  options,
  onSelect,
}: {
  value: string | null;
  options: { key: string; label: string; color: string }[];
  onSelect: (next: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.key === value) ?? null;

  return (
    <div className="relative size-full">
      {/* an unset value stays white with a faint "+" instead of painting a
          solid grey block — a column that is mostly empty (the demand fields)
          otherwise reads as a wall of grey */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex size-full items-center justify-center font-sans text-[14px] leading-[20px] transition-colors ${
          current
            ? "text-white hover:opacity-90"
            : "bg-white text-transparent hover:bg-[var(--hover-ghost)] hover:text-ink-muted"
        }`}
        style={current ? { backgroundColor: current.color } : undefined}
      >
        {current?.label ?? "+"}
      </button>
      <Popover open={open} onClose={() => setOpen(false)} className="w-[180px]">
        <div className="flex flex-col gap-[6px]">
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => {
                onSelect(o.key);
                setOpen(false);
              }}
              className="flex h-[32px] items-center justify-center rounded-[4px] font-sans text-[14px] text-white transition-transform hover:scale-[1.03]"
              style={{ backgroundColor: o.color }}
            >
              {o.label}
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

/** Small tag chip cell for Title (COO / CEO / …), inline-editable. */
export function TitleCell({
  value,
  onSave,
}: {
  value: string | null;
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
        className={CELL_INPUT}
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
      className={CELL_BUTTON}
      title={value ?? "Add title"}
    >
      {value ? (
        <span className="flex h-[24px] max-w-full items-center truncate rounded-[4px] bg-cyan-soft px-[10px] font-sans text-[14px] leading-[20px] text-ink">
          {value}
        </span>
      ) : (
        <span className="font-sans text-[14px] text-transparent transition-colors hover:text-ink-muted">
          +
        </span>
      )}
    </button>
  );
}

/** Free-text cell (Comments), inline-editable, left aligned. */
export function TextCell({
  value,
  onSave,
}: {
  value: string | null;
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
        className={CELL_INPUT}
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
      className={CELL_BUTTON}
      title={value ?? "Add comment"}
    >
      {value ?? ""}
    </button>
  );
}

/** Connected deals chips: first deal + "+N" overflow, like Monday link columns. */
export function DealsChipCell({ dealNames }: { dealNames: string[] }) {
  if (dealNames.length === 0) return <span className="block size-full" />;
  const [first, ...rest] = dealNames;
  return (
    <span className="flex size-full items-center justify-center gap-[4px] px-[8px]">
      <span className="flex h-[24px] min-w-0 items-center gap-[4px] truncate rounded-[4px] bg-cyan-tint px-[8px] font-sans text-[14px] leading-[20px] text-ink">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0">
          <circle cx="8" cy="8" r="6.4" stroke="#323338" strokeWidth="1.3" />
          <path d="M8 4.8v6.4M10 6.6c0-.9-.9-1.5-2-1.5s-2 .6-2 1.5 1 1.3 2 1.5 2 .6 2 1.5-.9 1.5-2 1.5-2-.6-2-1.5" stroke="#323338" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
        <span className="truncate">{first}</span>
      </span>
      {rest.length > 0 && (
        <span className="flex h-[24px] shrink-0 items-center rounded-[4px] bg-cyan-tint px-[6px] font-sans text-[14px] leading-[20px] text-ink">
          +{rest.length}
        </span>
      )}
    </span>
  );
}
