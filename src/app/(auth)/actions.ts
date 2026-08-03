"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { generateTempPassword } from "@/lib/temp-password";

export type AuthState = { error?: string; notice?: string } | null;

export async function signIn(_prev: AuthState, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUp(_prev: AuthState, formData: FormData) {
  const supabase = await createClient();

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  // Signing up no longer sets a password: the account is created with a
  // throwaway that nobody is told, and an admin approving the request on
  // /crm/team replaces it with the temporary password the new member is emailed.
  const password = generateTempPassword();
  const dial = String(formData.get("country_code") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  // friendly pre-flight check (the DB trigger is the hard gate)
  const { data: check } = await supabase.rpc("crm_can_register", { p_email: email });
  if (check && check !== "ok") {
    return { error: check as string };
  }

  const h = await headers();
  // canonical site URL wins so email links never point at a dev host
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    h.get("origin") ??
    `http://${h.get("host") ?? "localhost:3070"}`;

  // self-declared field: privileged tiers are only a REQUEST — everyone starts
  // as agent and Developer/CEO approves the requested role from /crm/team
  const FIELD_LABELS: Record<string, string> = {
    agent: "Sales Agent",
    media: "Media Team",
    manager: "Sales Manager",
    finance: "Finance",
  };
  const fieldRole = String(formData.get("field_role") ?? "agent");
  const safeField = fieldRole in FIELD_LABELS ? fieldRole : "agent";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // must be an allow-listed redirect URL in Supabase (…/auth/callback is),
      // otherwise GoTrue silently falls back to the Site URL (localhost bug)
      emailRedirectTo: `${origin}/auth/callback`,
      // the DB trigger accepts CRM signups with an invite or an approved company email
      data: {
        app: "crm",
        full_name: `${firstName} ${lastName}`.trim(),
        phone: phone ? `${dial} ${phone}`.trim() : "",
        title: FIELD_LABELS[safeField],
        requested_role: safeField,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // the account is created inactive: an admin approves it on /crm/team, which
  // issues the temporary password and emails it. There is nothing for the new
  // member to do until then, and no session to hand them either way.
  if (data.user) {
    return {
      notice:
        "Your request has been sent. Ignore the “Confirm your email” message — approval confirms your address for you. Once an administrator approves the request you'll receive a temporary password to sign in with here.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const h = await headers();
  // canonical site URL first, exactly like signUp — a request-derived origin
  // is how confirmation links ended up pointing at localhost
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    h.get("origin") ??
    `http://${h.get("host") ?? "localhost:3070"}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
