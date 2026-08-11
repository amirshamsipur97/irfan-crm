"use server";

import { createClient } from "@/lib/supabase/server";

/** Boards that may carry a saved column order (allow-list, never client input). */
const BOARD_KEYS = new Set([
  "leads",
  "contacts",
  "offers",
  "deals",
  "accounts",
  "projects",
  "activities",
  "developments",
  "units",
  "viewings",
]);

/**
 * Save this user's column order for a board. Fire-and-forget from the drag —
 * the UI already moved, and a failed write only means the layout is not
 * remembered, never that data was lost.
 */
export async function setColumnOrder(boardKey: string, keys: string[]) {
  if (!BOARD_KEYS.has(boardKey)) return { error: "unknown board" };
  if (!Array.isArray(keys) || keys.length > 60) return { error: "bad order" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { error } = await supabase.from("crm_column_order").upsert(
    {
      user_id: user.id,
      board_key: boardKey,
      keys: keys.filter((k) => typeof k === "string").slice(0, 60),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,board_key" }
  );
  if (error) return { error: error.message };
  return {};
}

/** This user's saved order for a board, or null when they never dragged one. */
export async function getColumnOrder(boardKey: string): Promise<string[] | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("crm_column_order")
    .select("keys")
    .eq("user_id", user.id)
    .eq("board_key", boardKey)
    .maybeSingle<{ keys: string[] }>();
  return data?.keys ?? null;
}
