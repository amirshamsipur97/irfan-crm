"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Minimum for a real password once the temporary one is being replaced. */
const MIN_LENGTH = 8;

/**
 * First-login password change: replaces the system-issued temporary password
 * with one the user chooses, then clears the flag that forces the dialog.
 *
 * Supabase requires a live session for updateUser, which is exactly the state
 * the user is in — they signed in with the temporary password.
 */
export async function setNewPassword(password: string, confirm: string) {
  if (password !== confirm) return { error: "The two passwords do not match." };
  if (password.length < MIN_LENGTH)
    return { error: `Use at least ${MIN_LENGTH} characters.` };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired — sign in again." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  // the flag is on the CRM profile, and the row-level policy already allows a
  // user to update their own row (the privilege guard only covers role/active)
  const { error: flagError, count } = await supabase
    .from("crm_users")
    .update({ must_change_password: false }, { count: "exact" })
    .eq("id", user.id);
  if (flagError) return { error: flagError.message };
  if (!count) return { error: "Could not update your profile — contact your admin." };

  revalidatePath("/", "layout");
  return {};
}
