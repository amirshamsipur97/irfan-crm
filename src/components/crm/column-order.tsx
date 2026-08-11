"use client";

/**
 * Drag-to-reorder for board COLUMNS, the sibling of row-tools.tsx.
 *
 * The order is per user (crm_column_order) — one agent rearranging a board
 * must not shuffle it under the others who are typing in it. Only the keys
 * are stored: unknown keys are dropped and new ones appended on read, so
 * adding or removing a column in code can never strand a saved layout.
 *
 * Pointer events, not HTML5 drag-and-drop — same reason as the rows: Safari,
 * and the ghost that follows the cursor.
 */

import { useMemo, useRef, useState } from "react";
import { setColumnOrder } from "@/app/(app)/crm/column-order-actions";

export interface OrderableColumn {
  key: string;
  label: string;
  w: number;
}

/** Saved order applied to the code's column list, then reconciled. */
export function applyColumnOrder<T extends { key: string }>(
  columns: T[],
  saved: string[] | null | undefined
): T[] {
  if (!saved?.length) return columns;
  const byKey = new Map(columns.map((c) => [c.key, c]));
  const ordered: T[] = [];
  for (const key of saved) {
    const col = byKey.get(key);
    if (col) {
      ordered.push(col);
      byKey.delete(key);
    }
  }
  // columns added to the code since this layout was saved keep their place
  // relative to each other, at the end
  return [...ordered, ...columns.filter((c) => byKey.has(c.key))];
}

export interface ColumnDrag {
  columns: OrderableColumn[];
  /** spread on each header cell — carries the key and starts the drag */
  headerProps: (key: string) => Record<string, unknown>;
  draggingKey: string | null;
}

export function useColumnOrder<T extends OrderableColumn>(opts: {
  boardKey: string;
  columns: T[];
  savedOrder?: string[] | null;
}): { columns: T[]; headerProps: (key: string) => Record<string, unknown>; draggingKey: string | null } {
  const { boardKey, columns, savedOrder } = opts;
  const [order, setOrder] = useState<string[] | null>(savedOrder ?? null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const draggedRef = useRef(false);

  const ordered = useMemo(() => applyColumnOrder(columns, order), [columns, order]);

  const commit = (keys: string[]) => {
    setOrder(keys);
    setColumnOrder(boardKey, keys);
  };

  const startDrag = (key: string, e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    const headerEl = (e.target as HTMLElement).closest("[data-col-key]") as HTMLElement | null;
    if (!headerEl) return;
    e.preventDefault();

    const startX = e.clientX;
    let ghost: HTMLElement | null = null;
    let lastTarget: HTMLElement | null = null;
    draggedRef.current = false;

    const clearIndicator = () => {
      if (lastTarget) lastTarget.style.boxShadow = "";
      lastTarget = null;
    };

    const beginGhost = () => {
      draggedRef.current = true;
      setDraggingKey(key);
      ghost = headerEl.cloneNode(true) as HTMLElement;
      ghost.style.cssText =
        `position:fixed;left:0;top:0;width:${headerEl.offsetWidth}px;` +
        `height:${headerEl.offsetHeight}px;margin:0;pointer-events:none;` +
        `z-index:9999;background:#fff;opacity:0.95;border:1px solid #d0d4e4;` +
        `border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.18);` +
        `display:flex;align-items:center;justify-content:center;`;
      document.body.appendChild(ghost);
    };

    const move = (ev: PointerEvent) => {
      if (!draggedRef.current && Math.abs(ev.clientX - startX) < 6) return;
      if (!draggedRef.current) beginGhost();
      if (ghost) {
        ghost.style.transform = `translate(${ev.clientX - headerEl.offsetWidth / 2}px, ${
          ev.clientY - 14
        }px) rotate(2deg)`;
      }
      const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      const target = el?.closest("[data-col-key]") as HTMLElement | null;
      if (target === lastTarget) return;
      clearIndicator();
      if (target && target.dataset.colKey !== key) {
        lastTarget = target;
        target.style.boxShadow = "inset 2px 0 0 0 #00a0a0";
      }
    };

    const up = (ev: PointerEvent) => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      ghost?.remove();
      const dropEl = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      const dropKey = (dropEl?.closest("[data-col-key]") as HTMLElement | null)?.dataset.colKey;
      clearIndicator();
      setDraggingKey(null);
      if (!draggedRef.current || !dropKey || dropKey === key) return;

      const keys = ordered.map((c) => c.key);
      const from = keys.indexOf(key);
      const to = keys.indexOf(dropKey);
      if (from < 0 || to < 0) return;
      keys.splice(from, 1);
      keys.splice(to, 0, key);
      commit(keys);
    };

    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  };

  return {
    columns: ordered,
    draggingKey,
    headerProps: (key: string) => ({
      "data-col-key": key,
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => startDrag(key, e),
      style: { cursor: "grab" },
      title: "Drag to move this column",
    }),
  };
}
