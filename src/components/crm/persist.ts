"use client";

import type { Dispatch, SetStateAction } from "react";

export type BoardToast = {
  message: string;
  tone?: "success" | "alert";
  undo?: () => void;
};

/**
 * One optimistic cell edit, shared by all nine boards.
 *
 * The boards used to patch local state and then fire the server action without
 * awaiting it, so a write the database refused (row-level security matches zero
 * rows and reports no error) still showed "We successfully updated 1 item" while
 * the value quietly reverted on the next refetch. This awaits the action,
 * restores the previous values when it fails, and only claims success when the
 * row was really saved.
 *
 * Returns true when the edit was persisted.
 */
export async function applyRowEdit<T extends { id: string }>(opts: {
  id: string;
  patch: Partial<T>;
  /** the row as it was before the edit — the source of the rollback values */
  prev: T | undefined;
  setRows: Dispatch<SetStateAction<T[]>>;
  save: (id: string, patch: Record<string, unknown>) => Promise<{ error?: string }>;
  setToast: (toast: BoardToast) => void;
  /** background writes (e.g. activity logging) skip the confirmation toast */
  silent?: boolean;
}): Promise<boolean> {
  const { id, patch, prev, setRows, save, setToast, silent } = opts;

  const previous = prev
    ? (Object.fromEntries(
        Object.keys(patch).map((k) => [k, (prev as Record<string, unknown>)[k] ?? null])
      ) as Partial<T>)
    : null;

  const merge = (values: Partial<T>) =>
    setRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...values } : r)));

  merge(patch);

  const result = await save(id, patch as Record<string, unknown>);
  if (result?.error) {
    if (previous) merge(previous);
    setToast({ message: result.error, tone: "alert" });
    return false;
  }

  if (!silent && previous) {
    setToast({
      message: "We successfully updated 1 item",
      undo: () => {
        merge(previous);
        save(id, previous as Record<string, unknown>);
      },
    });
  }
  return true;
}

/**
 * Await a non-cell board write (rename, stage move, owner change, group rename)
 * and roll the optimistic change back when the server rejects it.
 */
export async function persist(
  run: Promise<{ error?: string } | void>,
  opts: { revert?: () => void; setToast: (toast: BoardToast) => void; success?: string }
): Promise<boolean> {
  const result = await run;
  if (result && "error" in result && result.error) {
    opts.revert?.();
    opts.setToast({ message: result.error, tone: "alert" });
    return false;
  }
  if (opts.success) opts.setToast({ message: opts.success });
  return true;
}
