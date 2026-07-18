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
