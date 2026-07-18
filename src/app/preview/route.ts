import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Development-only review link: /preview signs into the preview account and
 * redirects to the app — no login form needed. Enabled only when
 * DEMO_LOGIN=enabled is present in the environment (.env.local, never prod).
 */
export async function GET(request: Request) {
  if (process.env.DEMO_LOGIN !== "enabled") {
    return new NextResponse("Not found", { status: 404 });
  }

  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;
  if (!email || !password) {
    return new NextResponse("Preview account is not configured", { status: 500 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return new NextResponse(`Preview login failed: ${error.message}`, { status: 500 });
  }

  return NextResponse.redirect(new URL("/", request.url));
}
