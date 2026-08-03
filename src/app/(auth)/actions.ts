"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

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
  const dial = String(formData.get("country_code") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

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

  // Signing up sets no password and sends NO email. supabase.auth.signUp used
  // to fire GoTrue's confirmation mail, whose built-in sender is rate-limited
  // ("email rate limit exceeded" after a few tries) — and that mail was never
  // part of the flow anyway, since approval confirms the address server-side.
  // crm_request_access creates the pre-confirmed, inactive account directly.
  const { data, error } = await supabase.rpc("crm_request_access", {
    p_email: email,
    p_full_name: `${firstName} ${lastName}`.trim(),
    p_phone: phone ? `${dial} ${phone}`.trim() : "",
    p_title: FIELD_LABELS[safeField],
    p_requested_role: safeField,
  });

  if (error) {
    return { error: error.message };
  }

  const result = (data ?? {}) as { error?: string; ok?: boolean };
  if (result.error) {
    return { error: result.error };
  }

  // the account is created inactive: an admin approves it on /crm/team, which
  // issues the temporary password. There is nothing for the new member to do
  // until then, and no session to hand them either way.
  return {
    notice:
      "Your request has been sent. Once an administrator approves it you'll get a temporary password to sign in with here — no email confirmation needed.",
  };
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
