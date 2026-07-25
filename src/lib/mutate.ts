/**
 * Row-level security rejects a write by matching zero rows, NOT by raising an
 * error: PostgREST answers `204 No Content` and supabase-js reports
 * `{ error: null }`. Every action that used the bare `.update()/.delete()` shape
 * therefore reported success while the database had saved nothing, and the board
 * kept the optimistic value until the next refetch silently reverted it.
 *
 * These helpers make the affected-row count part of the contract: a write that
 * touches no rows comes back as a real, user-readable error.
 */

export type MutationResult<T = undefined> = { error?: string; data?: T };

export const PERMISSION_ERROR =
  "You don't have permission to change this item — ask its owner or an admin.";

export const MISSING_ERROR = "That item no longer exists — refresh the board.";

type CountedResponse = {
  error: { message: string } | null;
  count: number | null;
};

/**
 * Run an UPDATE/DELETE built with `{ count: "exact" }` and translate an
 * empty result into the permission error instead of a silent success.
 *
 *   await counted(
 *     supabase.from("crm_leads").update(patch, { count: "exact" }).eq("id", id)
 *   );
 */
export async function counted(
  query: PromiseLike<CountedResponse>,
  emptyMessage: string = PERMISSION_ERROR
): Promise<MutationResult> {
  const { error, count } = await query;
  if (error) return { error: error.message };
  if (!count) return { error: emptyMessage };
  return {};
}
