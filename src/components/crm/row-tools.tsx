"use client";

/**
 * Shared per-row tools for ALL boards:
 *  - drag handle (⋮⋮) that reorders rows and moves them across groups
 *  - "…" menu: Open / Duplicate / Move to group / Delete
 * Persistence goes through app/(app)/crm/row-actions.ts (fractional `position`).
 */

import { useState } from "react";
import { Popover } from "@/components/crm/leads/cells";
import { canEditRow, OWNER_ONLY_MESSAGE } from "@/lib/permissions";
import type { CrmUser } from "@/lib/types";
import { deleteRow, duplicateRow, moveRow } from "@/app/(app)/crm/row-actions";

export const ROW_MIME = "application/x-crm-row";

/** Sort comparator for board rows (manual order; rows without position sink last). */
export function byPosition<T extends { position?: number }>(a: T, b: T) {
  return (a.position ?? Infinity) - (b.position ?? Infinity);
}

export interface BoardRowLike {
  id: string;
  name: string;
  group_id: string | null;
  position?: number;
  owner_id?: string | null;
  created_by?: string | null;
}

export interface RowToolsConfig {
  groups: { id: string; name: string }[];
  canEdit: (rowId: string) => boolean;
  onOpen?: (rowId: string) => void;
  onDuplicate: (rowId: string) => void;
  onMove: (rowId: string, groupId: string) => void;
  onDelete: (rowId: string) => void;
  onDropBefore: (dragId: string, groupId: string, beforeId: string | null) => void;
}

/** New fractional position for dropping `dragId` before `beforeId` (null = end of group). */
export function computeDropPosition<T extends BoardRowLike>(
  rows: T[],
  dragId: string,
  groupId: string,
  beforeId: string | null
): number {
  const group = rows
    .filter((r) => r.group_id === groupId && r.id !== dragId)
    .sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity));
  if (group.length === 0) return Date.now() / 1000;
  if (beforeId === null) return (group[group.length - 1].position ?? Date.now() / 1000) + 1;
  const idx = group.findIndex((r) => r.id === beforeId);
  if (idx === -1) return (group[group.length - 1].position ?? Date.now() / 1000) + 1;
  const next = group[idx].position ?? Date.now() / 1000;
  const prev = idx === 0 ? next - 2 : (group[idx - 1].position ?? next - 2);
  return (prev + next) / 2;
}

/**
 * One-stop factory: local optimistic state + server persistence for every
 * row-tools callback. Boards pass the result straight to their Group components.
 */
export function useRowTools<T extends BoardRowLike>(opts: {
  boardKey: string;
  rows: T[];
  setRows: React.Dispatch<React.SetStateAction<T[]>>;
  groups: { id: string; name: string }[];
  profile: CrmUser;
  onToast: (message: string, tone?: "success" | "alert") => void;
  onOpen?: (rowId: string) => void;
}): RowToolsConfig {
  const { boardKey, rows, setRows, groups, profile, onToast, onOpen } = opts;

  const guard = (rowId: string) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return null;
    if (!canEditRow(profile, row)) {
      onToast(OWNER_ONLY_MESSAGE, "alert");
      return null;
    }
    return row;
  };

  return {
    groups,
    onOpen,
    canEdit: (rowId) => {
      const row = rows.find((r) => r.id === rowId);
      return row ? canEditRow(profile, row) : false;
    },
    onDuplicate: async (rowId) => {
      const result = await duplicateRow(boardKey, rowId);
      if (result.error || !result.row) {
        onToast(result.error ?? "could not duplicate", "alert");
        return;
      }
      setRows((prev) => [...prev, result.row as unknown as T]);
      onToast("Item duplicated");
    },
    onMove: (rowId, groupId) => {
      const row = guard(rowId);
      if (!row || row.group_id === groupId) return;
      const position = computeDropPosition(rows, rowId, groupId, null);
      setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, group_id: groupId, position } : r)));
      moveRow(boardKey, rowId, { group_id: groupId, position });
      onToast(`Moved to ${groups.find((g) => g.id === groupId)?.name ?? "group"}`);
    },
    onDelete: async (rowId) => {
      const row = guard(rowId);
      if (!row) return;
      const prevRows = rows;
      setRows((prev) => prev.filter((r) => r.id !== rowId));
      const result = await deleteRow(boardKey, rowId);
      if (result.error) {
        setRows(prevRows);
        onToast(result.error, "alert");
      } else {
        onToast(`"${row.name}" deleted`);
      }
    },
    onDropBefore: (dragId, groupId, beforeId) => {
      const row = guard(dragId);
      if (!row) return;
      const position = computeDropPosition(rows, dragId, groupId, beforeId);
      setRows((prev) =>
        prev.map((r) => (r.id === dragId ? { ...r, group_id: groupId, position } : r))
      );
      moveRow(boardKey, dragId, { group_id: groupId, position });
    },
  };
}

/** Spread onto every row container so it accepts drops (insert BEFORE this row). */
export function dropTargetProps(
  tools: RowToolsConfig | undefined,
  groupId: string,
  beforeId: string | null
) {
  if (!tools) return {};
  return {
    onDragOver: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes(ROW_MIME)) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        (e.currentTarget as HTMLElement).style.boxShadow = "inset 0 2px 0 0 #00a0a0";
      }
    },
    onDragLeave: (e: React.DragEvent) => {
      (e.currentTarget as HTMLElement).style.boxShadow = "";
    },
    onDrop: (e: React.DragEvent) => {
      (e.currentTarget as HTMLElement).style.boxShadow = "";
      const dragId = e.dataTransfer.getData(ROW_MIME);
      if (!dragId) return;
      e.preventDefault();
      tools.onDropBefore(dragId, groupId, beforeId);
    },
  };
}

const ITEM_CLS =
  "flex w-full items-center gap-[10px] px-[14px] py-[7px] text-left font-sans text-[14px] leading-[20px] text-ink transition-colors hover:bg-[var(--hover-ghost)] disabled:cursor-not-allowed disabled:opacity-40";

/** The left-gutter handle: drag to reorder, click for the row menu. */
export function RowTools({
  row,
  tools,
}: {
  row: BoardRowLike;
  tools: RowToolsConfig;
}) {
  const [open, setOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const editable = tools.canEdit(row.id);

  return (
    <span className="absolute -left-[32px] top-1/2 z-20 -translate-y-1/2">
      <button
        type="button"
        aria-label={`Row options for ${row.name}`}
        draggable={editable}
        onDragStart={(e) => {
          e.dataTransfer.setData(ROW_MIME, row.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onClick={() => {
          setMoveOpen(false);
          setOpen((v) => !v);
        }}
        className={`flex h-[24px] w-[24px] items-center justify-center rounded-[4px] border border-line bg-white text-ink-muted opacity-0 shadow-sm transition-opacity hover:bg-canvas group-hover/row:opacity-100 ${
          open ? "opacity-100" : ""
        } ${editable ? "cursor-grab active:cursor-grabbing" : ""}`}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
          <circle cx="3.5" cy="2" r="1.1" />
          <circle cx="8.5" cy="2" r="1.1" />
          <circle cx="3.5" cy="6" r="1.1" />
          <circle cx="8.5" cy="6" r="1.1" />
          <circle cx="3.5" cy="10" r="1.1" />
          <circle cx="8.5" cy="10" r="1.1" />
        </svg>
      </button>

      <Popover open={open} onClose={() => setOpen(false)} align="left" className="w-[230px] py-[6px]">
        {tools.onOpen && (
          <button
            type="button"
            className={ITEM_CLS}
            onClick={() => {
              setOpen(false);
              tools.onOpen?.(row.id);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#676879" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.5 2h3.5v3.5M12 2L7.5 6.5M5.5 12H2V8.5M2 12l4.5-4.5" />
            </svg>
            Open
          </button>
        )}
        <button
          type="button"
          disabled={!editable}
          className={ITEM_CLS}
          onClick={() => {
            setOpen(false);
            tools.onDuplicate(row.id);
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#676879" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4.5" y="4.5" width="7.5" height="7.5" rx="1" />
            <path d="M9.5 4.5V3a1 1 0 00-1-1H3a1 1 0 00-1 1v5.5a1 1 0 001 1h1.5" />
          </svg>
          Duplicate
        </button>
        <div className="relative">
          <button
            type="button"
            disabled={!editable}
            className={ITEM_CLS}
            onClick={() => setMoveOpen((v) => !v)}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#676879" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 7h9M8 3.5L11.5 7 8 10.5" />
            </svg>
            Move to
            <svg className="ml-auto" width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#676879" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3.5 1.5L7 5 3.5 8.5" />
            </svg>
          </button>
          {moveOpen && (
            <div className="border-t border-line-soft">
              {tools.groups
                .filter((g) => g.id !== row.group_id)
                .map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={`${ITEM_CLS} pl-[38px]`}
                    onClick={() => {
                      setOpen(false);
                      setMoveOpen(false);
                      tools.onMove(row.id, g.id);
                    }}
                  >
                    {g.name}
                  </button>
                ))}
              {tools.groups.filter((g) => g.id !== row.group_id).length === 0 && (
                <p className="m-0 px-[38px] py-[6px] font-sans text-[13px] text-ink-muted">
                  No other groups
                </p>
              )}
            </div>
          )}
        </div>
        <div className="my-[5px] border-t border-line-soft" />
        <button
          type="button"
          disabled={!editable}
          className={`${ITEM_CLS} text-alert`}
          onClick={() => {
            setOpen(false);
            tools.onDelete(row.id);
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#e2445c" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3.5h10M5.5 3.5V2h3v1.5M3.5 3.5l.6 8a1 1 0 001 .9h3.8a1 1 0 001-.9l.6-8M5.7 6v3.5M8.3 6v3.5" />
          </svg>
          Delete
        </button>
      </Popover>
    </span>
  );
}
