"use client";

/**
 * The row you last clicked stays lit, one per board.
 *
 * Why a store outside React instead of board state: every board renders its
 * rows inside per-GROUP components, so board-level state would mean two more
 * props threaded through ten boards and their ten group components. The lit
 * row has to be exclusive ACROSS groups (clicking in group B must darken the
 * row in group A), so per-group state is wrong. Keyed by the board's
 * `board_key` — the same string used for custom columns, visits and column
 * order — so two boards never fight over one highlight.
 *
 * The lit row survives leaving and re-entering a board; that is deliberate,
 * it is where the person left off. A row that no longer exists simply never
 * matches and nothing is lit.
 *
 * Painting lives in globals.css (`[data-row-active]`) because the tint has to
 * beat the cell backgrounds the utilities put on the pinned name block and on
 * mirrored cells.
 */

import { useCallback, useSyncExternalStore } from "react";

const lit = new Map<string, string | null>();
const listeners = new Map<string, Set<() => void>>();

export function setActiveRow(boardKey: string, rowId: string | null) {
  if (lit.get(boardKey) === rowId) return;
  lit.set(boardKey, rowId);
  listeners.get(boardKey)?.forEach((notify) => notify());
}

export function useActiveRow(boardKey: string) {
  const subscribe = useCallback(
    (notify: () => void) => {
      let set = listeners.get(boardKey);
      if (!set) {
        set = new Set();
        listeners.set(boardKey, set);
      }
      set.add(notify);
      return () => {
        set?.delete(notify);
      };
    },
    [boardKey]
  );

  const activeId = useSyncExternalStore(
    subscribe,
    () => lit.get(boardKey) ?? null,
    () => null // server render: nothing is lit yet
  );

  /**
   * Spread onto a row container. mousedown, not click, so the row lights up
   * on the way IN to a cell editor rather than after it has opened — and so a
   * drag of the row handle lights it too.
   */
  const rowProps = (rowId: string) => ({
    "data-row-active": activeId === rowId ? "" : undefined,
    // every OTHER row dims while one is lit, so the lit one carries the eye.
    // Nothing dims while nothing is lit.
    "data-row-dim": activeId !== null && activeId !== rowId ? "" : undefined,
    onMouseDown: () => setActiveRow(boardKey, rowId),
  });

  return { activeId, rowProps };
}
