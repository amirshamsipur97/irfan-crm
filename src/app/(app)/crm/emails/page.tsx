import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { EmailsView } from "@/components/crm/email/EmailsView";
import type { CrmEmail } from "@/lib/types";
import type { RecipientSuggestion } from "@/components/crm/email/EmailComposer";

/** Outbound email center — compose to clients/developers and review the send log. */
export default async function EmailsPage() {
  const [profile, supabase] = await Promise.all([getProfile(), createClient()]);

  const [{ data: emails }, { data: contacts }, { data: accounts }] = await Promise.all([
    supabase
      .from("crm_emails")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<CrmEmail[]>(),
    supabase
      .from("crm_contacts")
      .select("name, email")
      .not("email", "is", null)
      .returns<{ name: string; email: string }[]>(),
    supabase
      .from("crm_accounts")
      .select("name, email")
      .not("email", "is", null)
      .returns<{ name: string; email: string }[]>(),
  ]);

  const suggestions: RecipientSuggestion[] = [
    ...(contacts ?? []).map((c) => ({ email: c.email, name: c.name, kind: "contact" as const })),
    ...(accounts ?? []).map((a) => ({ email: a.email, name: a.name, kind: "account" as const })),
  ];

  return <EmailsView profile={profile} emails={emails ?? []} suggestions={suggestions} />;
}
