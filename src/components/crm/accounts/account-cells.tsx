"use client";

import { useState } from "react";
import { CELL_INPUT } from "@/components/crm/cell-style";
import { PersonGlyph } from "@/components/crm/deals/deal-cells";
import { PencilChip } from "@/components/crm/leads/lead-cells";

/** Domain cell — external link, inline editable. */
export function DomainCell({
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
        placeholder="https://…"
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

  const href = value
    ? value.startsWith("http")
      ? value
      : `https://${value}`
    : null;

  return (
    <span className="group/cell flex size-full items-center justify-center gap-[4px] px-[8px]">
      {href ? (
        <>
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="truncate font-sans text-[14px] leading-[20px] text-link hover:underline"
            title={value ?? undefined}
          >
            {value}
          </a>
          <PencilChip
            label="Edit domain"
            onClick={() => {
              setDraft(value ?? "");
              setEditing(true);
            }}
          />
        </>
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft("");
            setEditing(true);
          }}
          className="flex size-full items-center justify-center font-sans text-[14px] text-transparent transition-colors hover:text-ink-muted"
        >
          +
        </button>
      )}
    </span>
  );
}

/** Industry cell — multiple tag chips with a dark "+N" overflow badge. */
export function IndustryCell({
  values,
  onSave,
}: {
  values: string[];
  onSave: (next: string[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(values.join(", "));

  if (editing) {
    const commit = () => {
      setEditing(false);
      const next = draft
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (JSON.stringify(next) !== JSON.stringify(values)) onSave(next);
    };
    return (
      <input
        autoFocus
        value={draft}
        placeholder="Software, Data, Internet"
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

  const shown = values.slice(0, 3);
  const overflow = values.length - shown.length;

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(values.join(", "));
        setEditing(true);
      }}
      className="flex size-full items-center justify-center gap-[4px] overflow-hidden px-[8px]"
      title={values.join(", ") || "Add industries"}
    >
      {shown.length === 0 && (
        <span className="font-sans text-[14px] text-transparent transition-colors hover:text-ink-muted">
          +
        </span>
      )}
      {shown.map((tag) => (
        <span
          key={tag}
          className="max-w-[72px] shrink-0 truncate rounded-[4px] bg-cyan-tint px-[8px] py-[2px] font-sans text-[14px] leading-[20px] text-ink"
        >
          {tag}
        </span>
      ))}
      {overflow > 0 && (
        <span className="shrink-0 rounded-[12px] bg-ink px-[8px] py-[2px] font-sans text-[13px] leading-[18px] text-white">
          +{overflow}
        </span>
      )}
    </button>
  );
}

/** Connected contacts chips: first contact + "+N" overflow. */
export function ContactsChipCell({ contactNames }: { contactNames: string[] }) {
  if (contactNames.length === 0) return <span className="block size-full" />;
  const [first, ...rest] = contactNames;
  return (
    <span className="flex size-full items-center justify-center gap-[4px] px-[8px]">
      <span className="flex h-[24px] min-w-0 items-center gap-[4px] truncate rounded-[4px] bg-cyan-tint px-[8px] font-sans text-[14px] leading-[20px] text-ink">
        <PersonGlyph size={12} />
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
