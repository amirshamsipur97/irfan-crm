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
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }
  const dial = String(formData.get("country_code") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  // friendly pre-flight check (the DB trigger is the hard gate)
  const { data: check } = await supabase.rpc("crm_can_register", { p_email: email });
  if (check && check !== "ok") {
    return { error: check as string };
  }

  const h = await headers();
  const origin = h.get("origin") ?? `http://${h.get("host") ?? "localhost:3070"}`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/login`,
      // the DB trigger accepts CRM signups with an invite or an approved company email
      data: {
        app: "crm",
        full_name: `${firstName} ${lastName}`.trim(),
        phone: phone ? `${dial} ${phone}`.trim() : "",
        title: String(formData.get("job_title") ?? "").trim(),
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // email confirmation is on — no session yet means "check your inbox"
  if (!data.session) {
    return {
      notice: "Almost there — check your inbox and confirm your email to activate your account.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const h = await headers();
  const origin = h.get("origin") ?? `http://${h.get("host") ?? "localhost:3070"}`;

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
