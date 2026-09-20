"use client";

import type { Dispatch, SetStateAction } from "react";

/** fired with a DuplicatePhoneInfo when a save hits the duplicate-phone guard */
export const DUPLICATE_PHONE_EVENT = "crm:duplicate-phone";

export type BoardToast = {
  message: string;
  tone?: "success" | "alert";
  undo?: () => void;
};

/**
 * A row that has been added to the board but whose insert has not come back
 * yet carries a placeholder id. Sending one to the server produced
 * `invalid input syntax for type uuid: "temp-..."` — every board write goes
 * through this check first.
 */
export function isTempId(id: string): boolean {
  return id.startsWith("temp-");
}

/**
 * Placeholder id for a row that is on the board but not yet inserted. Kept out
 * of the components: the React compiler rules read `Date.now()` / `Math.random()`
 * inside a component as an impure call, even in an event handler.
 */
export function tempRowId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const STILL_SAVING_MESSAGE =
  "Still saving this row — give it a second, then try again.";


export const UNREACHABLE_MESSAGE =
  "That did not save. The connection to the server dropped, or the app was updated while this page was open. Reload the page and try again.";

const SESSION_EXPIRED_MESSAGE =
  "Your session has expired. Sign in again, then save this once more.";

/**
 * Turn what the server said into what the team should read. "not authenticated"
 * is what an expired session looks like from an action, and an agent who reads
 * it as "the button is broken" retries forever instead of signing in again.
 */
export function friendlyError(message: string): string {
  return message.trim().toLowerCase() === "not authenticated" ? SESSION_EXPIRED_MESSAGE : message;
}

/**
 * Every board write goes through a server action, and an action can fail
 * BEFORE it returns a result: the network drops, the function times out, or
 * the page was loaded from a deployment that no longer exists, so its action
 * id is gone. The promise then REJECTS — which nothing here was catching, so
 * the optimistic value sat on the board as if it had been saved and a
 * composer's Save button stayed stuck on "Saving…" forever. This turns a
 * rejection into the same `{ error }` every caller already handles.
 */
export async function reachable<T extends { error?: string }>(
  run: Promise<T>
): Promise<T | (Partial<T> & { error: string })> {
  try {
    return await run;
  } catch (cause) {
    console.error("[crm] a server action never came back", cause);
    return { error: UNREACHABLE_MESSAGE } as Partial<T> & { error: string };
  }
}

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
  save: (id: string, patch: Record<string, unknown>) => Promise<{ error?: string; duplicate?: unknown }>;
  setToast: (toast: BoardToast) => void;
  /** background writes (e.g. activity logging) skip the confirmation toast */
  silent?: boolean;
}): Promise<boolean> {
  const { id, patch, prev, setRows, save, setToast, silent } = opts;

  if (isTempId(id)) {
    setToast({ message: STILL_SAVING_MESSAGE, tone: "alert" });
    return false;
  }

  const previous = prev
    ? (Object.fromEntries(
        Object.keys(patch).map((k) => [k, (prev as Record<string, unknown>)[k] ?? null])
      ) as Partial<T>)
    : null;

  const merge = (values: Partial<T>) =>
    setRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...values } : r)));

  merge(patch);

  const result = await reachable(save(id, patch as Record<string, unknown>));
  if (result?.error) {
    if (previous) merge(previous);
    if (result.duplicate && typeof window !== "undefined") {
      // someone else holds this phone: the app-wide Collaboration popup takes over
      window.dispatchEvent(new CustomEvent(DUPLICATE_PHONE_EVENT, { detail: result.duplicate }));
    } else {
      setToast({ message: friendlyError(result.error), tone: "alert" });
    }
    return false;
  }

  if (!silent && previous) {
    setToast({
      message: "We successfully updated 1 item",
      undo: () => {
        merge(previous);
        // fire and forget, but never as an unhandled rejection
        reachable(save(id, previous as Record<string, unknown>)).then((undone) => {
          if (undone?.error) setToast({ message: friendlyError(undone.error), tone: "alert" });
        });
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
  const result = await reachable(run as Promise<{ error?: string }>);
  if (result && "error" in result && result.error) {
    opts.revert?.();
    opts.setToast({ message: friendlyError(result.error), tone: "alert" });
    return false;
  }
  if (opts.success) opts.setToast({ message: opts.success });
  return true;
}
