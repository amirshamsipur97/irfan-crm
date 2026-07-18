import { createClient } from "@/lib/supabase/server";

/** Upsert the signed-in user's visit timestamp for a board (feeds the Recents tab). */
export async function recordBoardVisit(boardKey: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("crm_board_visits")
    .upsert({ user_id: user.id, board_key: boardKey, visited_at: new Date().toISOString() });
}
