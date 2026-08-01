"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CELL_BUTTON, CELL_INPUT } from "@/components/crm/cell-style";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import type { CrmStage, CrmUser } from "@/lib/types";
import { daysAgoLabel, leadHash } from "./board-config";

/** Board checkbox (16px, teal when checked). */
export function Checkbox({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked?: boolean;
  onChange?: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      disabled={disabled}
      checked={checked ?? false}
      onChange={onChange}
      className={`size-[16px] shrink-0 appearance-none rounded-[2px] border border-line-strong bg-white checked:border-teal checked:bg-teal ${
        disabled ? "opacity-40" : "cursor-pointer"
      }`}
    />
  );
}

/** Inline-editable text, styled like Monday's editable typography. */
export function InlineEdit({
  value,
  onSave,
  className = "",
  autoEdit = false,
  placeholder = "",
  style,
  fill = false,
}: {
  value: string;
  onSave: (next: string) => void;
  className?: string;
  autoEdit?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
  /**
   * Stretch to the whole cell. Without this an empty value leaves a button with
   * no content, so the only way in is a pixel-perfect click in the middle of
   * the box — the single most common complaint about entering data. Off by
   * default because the group title uses this inline, next to other controls.
   */
  fill?: boolean;
}) {
  const [editing, setEditing] = useState(autoEdit);
  const [draft, setDraft] = useState(value);

  if (editing) {
    const commit = () => {
      setEditing(false);
      if (draft !== value) onSave(draft);
    };
    return (
      <input
        autoFocus
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={`${
          fill
            ? CELL_INPUT
            : "rounded-[4px] border border-teal-deep bg-white px-[4px] outline-none"
        } ${className}`}
        style={style}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={`${
        fill
          ? CELL_BUTTON
          : "truncate rounded-[4px] border border-transparent px-[5px] text-left transition-colors hover:border-line-strong"
      } ${className}`}
      style={style}
      title={value}
    >
      {value || placeholder}
    </button>
  );
}

/**
 * Fixed-position coordinates for a panel anchored to a cell — escapes the
 * board's overflow clipping. Falls back to pure anchor math when the
 * viewport reports 0 (embedded webviews).
 */
export function anchorFixedPos(
  anchor: DOMRect,
  w: number,
  h: number,
  align: "center" | "right" | "left" = "center"
) {
  const vw = window.innerWidth || document.documentElement.clientWidth;
  const vh = window.innerHeight || document.documentElement.clientHeight;
  let left =
    align === "center"
      ? anchor.left + anchor.width / 2 - w / 2
      : align === "right"
        ? anchor.right - w
        : anchor.left;
  if (vw) left = Math.max(8, Math.min(left, vw - w - 8));
  let top = anchor.bottom + 4;
  if (vh && top + h > vh) top = Math.max(8, anchor.top - h - 4);
  return { left, top };
}

/** Generic cell-anchored popover (fixed — never clipped by the board scroller). */
export function Popover({
  open,
  onClose,
  children,
  className = "",
  align = "center",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  align?: "center" | "right" | "left";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const el = ref.current;
    const anchor = el?.parentElement?.getBoundingClientRect();
    if (el && anchor) setPos(anchorFixedPos(anchor, el.offsetWidth, el.offsetHeight, align));
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    // board scrolling would detach a fixed panel from its cell — close instead
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
  return (
    <div
      ref={ref}
      className={`fixed z-[70] rounded-[8px] border border-line bg-white p-[8px] shadow-[0px_6px_20px_rgba(0,0,0,0.2)] ${className}`}
      style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: -9999 }}
    >
      {children}
    </div>
  );
}

/** Status cell — full-bleed stage color, click opens Monday-style color menu. */
export function StatusCell({
  stage,
  stages,
  onSelect,
}: {
  stage: CrmStage | undefined;
  stages: CrmStage[];
  onSelect: (stageId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative size-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex size-full items-center justify-center font-sans text-[14px] leading-[20px] text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: stage?.color ?? "#c4c4c4" }}
      >
        <span className="truncate px-[4px]">{stage?.name ?? ""}</span>
      </button>
      <Popover open={open} onClose={() => setOpen(false)} className="w-[190px]">
        <div className="flex flex-col gap-[6px]">
          {stages.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onSelect(s.id);
                setOpen(false);
              }}
              className="flex h-[32px] items-center justify-center rounded-[4px] font-sans text-[14px] text-white transition-transform hover:scale-[1.03]"
              style={{ backgroundColor: s.color }}
            >
              <span className="truncate px-[6px]">{s.name}</span>
            </button>
          ))}
        </div>
        <div className="mt-[8px] border-t border-line pt-[6px]">
          <button
            type="button"
            className="flex h-[32px] w-full items-center justify-center gap-[8px] rounded-[4px] font-sans text-[14px] leading-[20px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M10.6 2.9l2.5 2.5L6 12.5l-3.2.7.7-3.2 7.1-7.1z" stroke="#323338" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
            Edit Labels
          </button>
        </div>
        <div className="mt-[6px] border-t border-line pt-[6px]">
          <button
            type="button"
            className="flex h-[32px] w-full items-center justify-center gap-[8px] rounded-[4px] font-sans text-[14px] leading-[20px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M8 1.8l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5 1.5-4z" fill="#a25ddc" />
              <path d="M12.8 10.6l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9z" fill="#00d2d2" />
            </svg>
            Auto-assign labels
          </button>
        </div>
      </Popover>
    </div>
  );
}

/** Owner cell — avatar or empty slot, click opens member picker. */
export function OwnerCell({
  owner,
  users,
  onSelect,
}: {
  owner: CrmUser | undefined;
  users: CrmUser[];
  onSelect: (ownerId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex size-full items-center justify-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Assign owner"
        className="flex items-center justify-center rounded-full transition-shadow hover:shadow-[0_0_0_2px_var(--color-cyan-tint)]"
      >
        {owner ? (
          <Avatar name={owner.full_name || owner.email} src={owner.avatar_url} size={26} />
        ) : (
          <span className="flex size-[26px] items-center justify-center rounded-full border border-dashed border-line-strong bg-canvas">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="8" cy="5.2" r="2.6" stroke="#9699a6" strokeWidth="1.2" />
              <path d="M2.8 13.4c.9-2.5 2.8-3.8 5.2-3.8s4.3 1.3 5.2 3.8" stroke="#9699a6" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </span>
        )}
      </button>
      <Popover open={open} onClose={() => setOpen(false)} className="w-[220px]">
        <div className="flex max-h-[240px] flex-col gap-[2px] overflow-y-auto">
          {users.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                onSelect(u.id);
                setOpen(false);
              }}
              className="flex items-center gap-[8px] rounded-[4px] px-[8px] py-[6px] text-left transition-colors hover:bg-[var(--hover-ghost)]"
            >
              <Avatar name={u.full_name || u.email} src={u.avatar_url} size={24} />
              <span className="truncate font-sans text-[14px] leading-[20px] text-ink">
                {u.full_name || u.email}
              </span>
            </button>
          ))}
          {owner && (
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                setOpen(false);
              }}
              className="mt-[2px] rounded-[4px] border-t border-line-soft px-[8px] py-[6px] text-left font-sans text-[13px] leading-[20px] text-ink-muted transition-colors hover:bg-[var(--hover-ghost)]"
            >
              Remove owner
            </button>
          )}
        </div>
      </Popover>
    </div>
  );
}

const BAR_COUNT = 9;

/** Activities timeline cell — "Nd ago" + decorative activity bars + add button. */
export function TimelineCell({
  leadId,
  lastActivityAt,
  hasActivity,
  onAdd,
  addActive = false,
}: {
  leadId: string;
  lastActivityAt: string | null;
  hasActivity: boolean;
  /** opens the board's log-activity menu (deals board) */
  onAdd?: () => void;
  addActive?: boolean;
}) {
  const label = daysAgoLabel(lastActivityAt);
  const h = leadHash(leadId);
  const incoming = h % BAR_COUNT;
  const outgoing = (h >> 3) % BAR_COUNT;

  return (
    <div className="flex size-full items-center gap-[4px] overflow-hidden pl-[8px]">
      <span className="shrink-0 font-sans text-[14px] leading-[20px] text-ink-disabled">
        {label ?? ""}
      </span>
      <span className="flex items-center gap-[2px] px-[4px]">
        {Array.from({ length: BAR_COUNT }, (_, i) => {
          const color =
            hasActivity && i === incoming
              ? "#ff5ac4"
              : hasActivity && i === outgoing
                ? "#66ccff"
                : "#f6f7fb";
          return (
            <span
              key={i}
              className="h-[24px] w-[6px] shrink-0 rounded-[4px]"
              style={{ backgroundColor: color }}
            />
          );
        })}
      </span>
      <button
        type="button"
        aria-label="Add activity"
        onClick={onAdd}
        className={`flex size-[24px] shrink-0 items-center justify-center rounded-[4px] ${
          addActive ? "bg-teal-deep" : "hover:bg-[var(--hover-ghost)]"
        }`}
      >
        <Icon name="tlAdd" size={16} className={addActive ? "brightness-0 invert" : ""} />
      </button>
    </div>
  );
}

/** Group-footer battery bar showing color distribution (status / source summaries). */
export function BatteryBar({
  segments,
}: {
  segments: { color: string; count: number }[];
}) {
  const total = segments.reduce((s, x) => s + x.count, 0);
  return (
    <div className="relative h-[24px] w-[123px] overflow-hidden rounded-[2px] bg-[#c4c4c4]">
      {total > 0 && (
        <div className="flex size-full items-center">
          {segments
            .filter((s) => s.count > 0)
            .map((s, i) => (
              <div
                key={`${s.color}-${i}`}
                className="h-full"
                style={{ backgroundColor: s.color, width: `${(s.count / total) * 100}%` }}
                title={`${Math.round((s.count / total) * 100)}%`}
              />
            ))}
        </div>
      )}
    </div>
  );
}
