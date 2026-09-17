import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { RemindersBoard } from "@/components/crm/reminders/RemindersBoard";
import type { CrmUser } from "@/lib/types";
import { listReminders } from "./actions";

export default async function RemindersPage() {
  const [profile, supabase, reminders] = await Promise.all([getProfile(), createClient(), listReminders()]);
  const { data: users } = await supabase
    .from("crm_users")
    .select("*")
    .order("full_name")
    .returns<CrmUser[]>();
  return <RemindersBoard profile={profile} initialReminders={reminders} users={users ?? []} />;
}
