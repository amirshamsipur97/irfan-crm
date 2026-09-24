import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { isFullAccess } from "@/lib/permissions";
import { PhoneSearch } from "@/components/crm/phone-search/PhoneSearch";
import type { CrmUser } from "@/lib/types";

export default async function PhoneSearchPage() {
  const [profile, supabase] = await Promise.all([getProfile(), createClient()]);
  // developer + CEO only; the action checks again, this just keeps others off the page
  if (!isFullAccess(profile.role)) redirect("/crm");
  const { data: users } = await supabase.from("crm_users").select("*").order("full_name").returns<CrmUser[]>();
  return <PhoneSearch users={users ?? []} />;
}
