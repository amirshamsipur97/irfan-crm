"use client";

import { useId, useState } from "react";
import { createPortal } from "react-dom";
import { CELL_BUTTON, CELL_BUTTON_TEXT, CELL_INPUT, CELL_INPUT_TEXT } from "@/components/crm/cell-style";
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
  suggestions,
  placeholder,
}: {
  value: string | null;
  onSave: (next: string) => void;
  /**
   * Values already used elsewhere, offered as a native datalist. Free text
   * still wins — this only stops "Azura" / "azura" / "Azura " becoming three
   * different projects when everyone types the name by hand.
   */
  suggestions?: string[];
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  // one id per cell instance, so two open editors never share a list
  const listId = useId();

  if (editing) {
    const commit = () => {
      setEditing(false);
      const next = draft.trim();
      if (next !== (value ?? "")) onSave(next);
    };
    return (
      <>
        <input
          autoFocus
          value={draft}
          list={suggestions?.length ? listId : undefined}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          className={CELL_INPUT_TEXT}
        />
        {!!suggestions?.length && (
          <datalist id={listId}>
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        )}
      </>
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value ?? "");
        setEditing(true);
      }}
      className={CELL_BUTTON_TEXT}
      title={value ?? placeholder ?? "Add comment"}
    >
      <span className="min-w-0 truncate">{value ?? ""}</span>
    </button>
  );
}

/**
 * Note cell that edits in its own dialog — the negotiation note is a
 * paragraph, not a tag, so a one-line inline input would hide most of it.
 * Portalled to <body>: rendered inline, the fixed overlay would be painted
 * over by lower groups' sticky titles (same stacking-context trap the
 * ConnectPicker fell into).
 */
export function NoteDialogCell({
  value,
  title,
  placeholder,
  onSave,
}: {
  value: string | null;
  title: string;
  placeholder?: string;
  onSave: (next: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const commit = () => {
    setOpen(false);
    const next = draft.trim() || null;
    if (next !== (value ?? null)) onSave(next);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDraft(value ?? "");
          setOpen(true);
        }}
        className={CELL_BUTTON_TEXT}
        title={value ?? "Add note"}
      >
        <span className="min-w-0 truncate">{value ?? ""}</span>
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[96] flex items-center justify-center">
            <button
              type="button"
              aria-label="Close note dialog"
              onClick={() => setOpen(false)}
              className="absolute inset-0 cursor-default bg-black/30"
            />
            <div className="relative w-[520px] rounded-[8px] bg-white p-[24px] shadow-[0px_15px_50px_rgba(0,0,0,0.3)]">
              <h3 className="m-0 pb-[12px] font-display text-[18px] font-medium leading-[24px] text-ink">
                {title}
              </h3>
              <textarea
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                }}
                rows={8}
                placeholder={placeholder}
                className="w-full resize-y rounded-[4px] border border-line-strong p-[10px] font-sans text-[14px] leading-[20px] text-ink outline-none focus:border-teal-deep"
              />
              <div className="mt-[14px] flex justify-end gap-[8px]">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-[32px] rounded-[4px] px-[12px] font-sans text-[14px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={commit}
                  className="h-[32px] rounded-[4px] bg-teal-deep px-[14px] font-sans text-[14px] text-white transition-opacity hover:opacity-90"
                >
                  Save
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
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
