"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// "use server" modules may only export async functions — keep this private
const HOME_SECTION_KEYS = ["pipeline", "meetings", "recents", "accounts", "contacts"];

/** Persist the user's Home layout (ordered, enabled widget keys). */
export async function saveHomeLayout(sections: string[]) {
  const clean = sections.filter((s) => HOME_SECTION_KEYS.includes(s));
  if (clean.length === 0) return { error: "keep at least one widget" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { error } = await supabase
    .from("crm_home_layout")
    .upsert({ user_id: user.id, sections: clean, updated_at: new Date().toISOString() });
  if (error) return { error: error.message };
  revalidatePath("/");
  return {};
}
