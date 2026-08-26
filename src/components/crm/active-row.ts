"use client";

/**
 * Two "one row at a time" marks, shared by every board.
 *
 *  - the LIT row: whatever you last clicked, highlighted so you keep your
 *    place while working across a wide sheet.
 *  - the TICKED row: the checkbox at the head of each row. It used to be a
 *    multi-select Set per group that nothing in the product ever read, so
 *    several boxes could sit green at once for no reason. It is now a single
 *    mark for the whole board — ticking one clears the other, even across
 *    groups — and the group header's "select all" went with it, since it
 *    could only ever produce the thing being prevented.
 *
 * Why a store outside React instead of board state: every board renders its
 * rows inside per-GROUP components, so board-level state would mean more
 * props threaded through ten boards and their ten group components — and
 * both marks have to be exclusive ACROSS groups, which per-group state
 * cannot do. Keyed by the board's `board_key`, the same string used for
 * custom columns, visits and column order, so two boards never fight over
 * one mark.
 *
 * Both marks survive leaving and re-entering a board; that is deliberate, it
 * is where the person left off. A row that no longer exists simply never
 * matches and nothing is marked.
 *
 * Painting of the lit row lives in globals.css (`[data-row-active]`) because
 * the tint has to beat the cell backgrounds the utilities put on the pinned
 * name block and on the cells.
 */

import { useCallback, useSyncExternalStore } from "react";

type Slot = "active" | "checked";

const marked = new Map<string, string | null>();
const listeners = new Map<string, Set<() => void>>();

const slotKey = (boardKey: string, slot: Slot) => `${boardKey}|${slot}`;

function setMark(boardKey: string, slot: Slot, rowId: string | null) {
  const key = slotKey(boardKey, slot);
  if (marked.get(key) === rowId) return;
  marked.set(key, rowId);
  listeners.get(key)?.forEach((notify) => notify());
}

function useMark(boardKey: string, slot: Slot) {
  const key = slotKey(boardKey, slot);
  const subscribe = useCallback(
    (notify: () => void) => {
      let set = listeners.get(key);
      if (!set) {
        set = new Set();
        listeners.set(key, set);
      }
      set.add(notify);
      return () => {
        set?.delete(notify);
      };
    },
    [key]
  );

  return useSyncExternalStore(
    subscribe,
    () => marked.get(key) ?? null,
    () => null // server render: nothing is marked yet
  );
}

export function setActiveRow(boardKey: string, rowId: string | null) {
  setMark(boardKey, "active", rowId);
}

export function useActiveRow(boardKey: string) {
  const activeId = useMark(boardKey, "active");

  /**
   * Spread onto a row container. mousedown, not click, so the row lights up
   * on the way IN to a cell editor rather than after it has opened — and so a
   * drag of the row handle lights it too.
   */
  const rowProps = (rowId: string) => ({
    "data-row-active": activeId === rowId ? "" : undefined,
    onMouseDown: () => setActiveRow(boardKey, rowId),
  });

  return { activeId, rowProps };
}

/** The row checkbox: one tick per board, and ticking a ticked box clears it. */
export function useCheckedRow(boardKey: string) {
  const checkedId = useMark(boardKey, "checked");
  return {
    checkedId,
    isChecked: (rowId: string) => checkedId === rowId,
    toggleChecked: (rowId: string) =>
      setMark(boardKey, "checked", checkedId === rowId ? null : rowId),
  };
}
