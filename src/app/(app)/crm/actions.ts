"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Star / unstar a board on the Workspace home Recents tab. */
export async function toggleBoardFavorite(boardKey: string, favorite: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  if (favorite) {
    const { error } = await supabase
      .from("crm_board_favorites")
      .upsert({ user_id: user.id, board_key: boardKey });
    if (error) return { error: error.message };
  } else {
    // un-starring something that was never starred is a no-op, not a failure
    const { error } = await supabase
      .from("crm_board_favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("board_key", boardKey);
    if (error) return { error: error.message };
  }

  revalidatePath("/crm");
  return {};
}

/**
 * Collapse / expand a board group FOR THE CURRENT USER only.
 * Shared across all nine boards — see lib/group-prefs.ts for the read side.
 */
export async function setGroupCollapsed(
  boardKey: string,
  groupId: string,
  collapsed: boolean
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { error } = await supabase.from("crm_group_prefs").upsert(
    {
      user_id: user.id,
      board_key: boardKey,
      group_id: groupId,
      is_collapsed: collapsed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,board_key,group_id" }
  );
  if (error) return { error: error.message };
  return {};
}
