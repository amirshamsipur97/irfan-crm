import { createClient } from "@/lib/supabase/server";

/**
 * Per-viewer collapse state for board groups.
 *
 * `crm_*_groups.is_collapsed` is a single shared column, so one agent collapsing
 * "New Leads" collapsed it for the whole team. Collapse is a view preference,
 * so it now lives in `crm_group_prefs` keyed by user. Pages overlay the viewer's
 * preference onto the group rows, which keeps every Group component unchanged —
 * they still just read `group.is_collapsed`.
 */
export async function withCollapsePrefs<T extends { id: string; is_collapsed?: boolean }>(
  boardKey: string,
  groups: T[]
): Promise<T[]> {
  if (groups.length === 0) return groups;

  const supabase = await createClient();
  const { data } = await supabase
    .from("crm_group_prefs")
    .select("group_id, is_collapsed")
    .eq("board_key", boardKey)
    .returns<{ group_id: string; is_collapsed: boolean }[]>();

  if (!data || data.length === 0) return groups;

  const byGroup = new Map(data.map((p) => [p.group_id, p.is_collapsed]));
  return groups.map((g) =>
    byGroup.has(g.id) ? { ...g, is_collapsed: byGroup.get(g.id) as boolean } : g
  );
}
