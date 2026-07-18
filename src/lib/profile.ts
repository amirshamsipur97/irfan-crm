import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CrmUser } from "@/lib/types";

/** Authenticated CRM profile for the current request (deduped across layout/pages). */
export const getProfile = cache(async (): Promise<CrmUser> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("crm_users")
    .select("*")
    .eq("id", user.id)
    .single<CrmUser>();

  // signed-in but not a CRM member (e.g. unapproved Google account) —
  // /auth/denied signs the session out; plain /login would redirect-loop
  if (!profile || !profile.is_active) redirect("/auth/denied");

  return profile;
});
